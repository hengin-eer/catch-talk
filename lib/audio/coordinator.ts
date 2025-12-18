import type { MsgPacketType } from "@/types/game";
import { AudioStreamCapture } from "./capture";
import { createNoiseReducer, type NoiseReductionChain } from "./noiseReduction";
import { MediaStreamRecorder } from "./recorder";
import { stt } from "./stt";
import type { CoordinatorConfig, Speaker } from "./types";
import { VoiceActivityDetector } from "./vad";

type PlayerRuntime = {
  speaker: Speaker;
  capture: AudioStreamCapture;
  noiseReduction: NoiseReductionChain;
  vad: VoiceActivityDetector;
  recorder: MediaStreamRecorder;
  isSpeaking: boolean;
  speakStartAt: number | null;
  shouldDiscard: boolean;
  collisionFlag: boolean;
  lastAvgRms: number;
};

export class ConversationCoordinator {
  private ctx: AudioContext | null = null;
  private players: Map<Speaker, PlayerRuntime> = new Map();
  private overlapTimer: number | null = null;

  constructor(private config: CoordinatorConfig) {}

  async start() {
    this.ctx = new AudioContext({
      latencyHint: "interactive",
    });

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    // stop()が呼ばれていたら中断
    if (!this.ctx) return;

    await this.setupPlayer("player1");

    // stop()が呼ばれていたら中断
    if (!this.ctx) return;

    await this.setupPlayer("player2");
  }

  private async setupPlayer(speaker: Speaker) {
    if (!this.ctx) {
      // 既にstop()されている場合は何もしない
      return;
    }

    const capture = new AudioStreamCapture();
    const stream = await capture.start(
      this.config.micDeviceIdBySpeaker[speaker],
    );
    // capture.start()中にstop()が呼ばれてctxがnullになる可能性があるため再チェック
    if (!this.ctx) {
      capture.stop();
      return;
    }

    const source = this.ctx.createMediaStreamSource(stream);

    const noiseReduction = createNoiseReducer(this.ctx);

    const vad = new VoiceActivityDetector(this.ctx, {
      startThreshold: this.config.vad?.startThreshold ?? 0.5,
      endThreshold: this.config.vad?.endThreshold ?? 0.3,
      hangover_ms: this.config.vad?.hangover_ms ?? 500,
      minSpeech_ms: this.config.vad?.minSpeech_ms ?? 150,
      maxSpeech_ms: this.config.vad?.maxSpeech_ms ?? 10000,
    });
    await vad.initialize();

    const recorder = new MediaStreamRecorder(this.ctx, this.config.recorder);

    // DelayNode for look-ahead recording (prevent cutting off the beginning of speech)
    const delayNode = this.ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.3; // 0.3秒遅らせることで、発話の頭切れを防ぐ

    // 接続フロー:
    // マイク入力 -> ノイズ除去 -> VAD (検知用・リアルタイム)
    //                         -> 遅延 (0.3秒) -> 録音 (保存用)
    source.connect(noiseReduction.input);
    const cleanAudio = noiseReduction.output;

    // VADにはリアルタイムの音声を流す（検知の遅れをなくすため）
    vad.connect(cleanAudio);

    // 録音には少し遅らせた音声を流す（検知した瞬間に、少し前の音から録音できるようにするため）
    cleanAudio.connect(delayNode);
    recorder.connectInput(delayNode);

    const runtime: PlayerRuntime = {
      speaker,
      capture,
      noiseReduction,
      vad,
      recorder,
      isSpeaking: false,
      speakStartAt: null,
      shouldDiscard: false,
      collisionFlag: false,
      lastAvgRms: 0,
    };

    this.players.set(speaker, runtime);

    // VAD Events
    vad.on("speech_start", () => this.handleSpeechStart(runtime));
    vad.on("speech_end", (avgRms) => this.handleSpeechEnd(runtime, avgRms));
    vad.on("rms", (rms) => this.config.onRms?.(speaker, rms));
  }

  private handleSpeechStart(rt: PlayerRuntime) {
    rt.isSpeaking = true;
    rt.speakStartAt = Date.now();
    rt.shouldDiscard = false;
    rt.collisionFlag = false;

    rt.recorder.start();
    this.config.onVADStateChange?.(rt.speaker, true);

    this.checkOverlap();
  }

  private async handleSpeechEnd(rt: PlayerRuntime, avgRms: number) {
    rt.isSpeaking = false;
    const startAt = rt.speakStartAt;
    rt.speakStartAt = null;
    // 丸め処理: 小数点第3位まで (例: 0.12345 -> 0.123)
    const roundedRms = Math.round(avgRms * 1000) / 1000;
    rt.lastAvgRms = Math.max(0, Math.min(1, roundedRms));

    this.config.onVADStateChange?.(rt.speaker, false);
    this.clearOverlapTimer();

    const blob = await rt.recorder.stop();

    if (rt.shouldDiscard || startAt === null) {
      rt.shouldDiscard = false;
      rt.collisionFlag = false;
      return;
    }

    const endAt = Date.now();
    const duration_ms = Math.max(0, endAt - startAt);

    // STT
    // Opus supports only 8000, 12000, 16000, 24000, 48000 Hz.
    // If the context sample rate is 44100 (common default), we should not send it as a config,
    // because MediaRecorder likely resamples to 48000 for Opus, or the backend will detect it from the file.
    const sampleRate = this.ctx?.sampleRate;
    const supportedRates = [8000, 12000, 16000, 24000, 48000];
    const sttOptions =
      sampleRate && supportedRates.includes(sampleRate)
        ? { sample_rate_hz: sampleRate }
        : {};

    const text = await stt(blob, sttOptions);

    const packet: MsgPacketType = {
      uuid: crypto.randomUUID(),
      speaker: rt.speaker,
      start_at: new Date(startAt),
      duration_ms,
      volume: rt.lastAvgRms,
      text,
      is_collision: rt.collisionFlag,
    };

    rt.collisionFlag = false;
    this.config.onPacket(packet);
  }

  private checkOverlap() {
    const p1 = this.players.get("player1");
    const p2 = this.players.get("player2");

    if (p1?.isSpeaking && p2?.isSpeaking) {
      if (this.overlapTimer === null) {
        this.overlapTimer = window.setTimeout(() => {
          this.overlapTimer = null;
          if (!(p1.isSpeaking && p2.isSpeaking)) return;

          const t1 = p1.speakStartAt ?? 0;
          const t2 = p2.speakStartAt ?? 0;

          const earlier = t1 <= t2 ? p1 : p2;
          const later = t1 <= t2 ? p2 : p1;

          // Earlier: Force End & Discard
          earlier.shouldDiscard = true;
          earlier.vad.forceEnd();
          earlier.recorder.stop(); // This will trigger handleSpeechEnd but shouldDiscard is true

          // Later: Continue but mark collision
          later.collisionFlag = true;
        }, this.config.collisionHold_ms ?? 500);
      }
    } else {
      this.clearOverlapTimer();
    }
  }

  private clearOverlapTimer() {
    if (this.overlapTimer !== null) {
      window.clearTimeout(this.overlapTimer);
      this.overlapTimer = null;
    }
  }

  stop() {
    this.clearOverlapTimer();
    this.players.forEach((rt) => {
      rt.capture.stop();
      rt.vad.disconnect();
      // Close context if needed, or just suspend
    });
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.players.clear();
  }
}
