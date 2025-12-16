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

    await this.setupPlayer("player1");
    await this.setupPlayer("player2");
  }

  private async setupPlayer(speaker: Speaker) {
    if (!this.ctx) return;

    const capture = new AudioStreamCapture();
    const stream = await capture.start(
      this.config.micDeviceIdBySpeaker[speaker],
    );
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

    // Connect: Source -> NoiseReduction -> VAD -> Recorder
    source.connect(noiseReduction.input);
    const vadInput = noiseReduction.output;
    const vadOutput = vad.connect(vadInput);
    recorder.connectInput(vadOutput);

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
    rt.lastAvgRms = Math.max(0, Math.min(1, avgRms));

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
    const text = await stt(blob, { sample_rate_hz: this.ctx?.sampleRate });

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
