import type { MsgPacketType } from "@/types/game";

type Speaker = "player1" | "player2";

type StartOptions = {
  micDeviceIdBySpeaker: Record<Speaker, string>;
  startThreshold?: number; // default 0.5
  endThreshold?: number; // default 0.3
  hangoverMs?: number; // default 500
  minSpeechMs?: number; // default 150
  maxSpeechMs?: number; // default 10000
  collisionHoldMs?: number; // default 500
  onPacket: (packet: MsgPacketType) => void;
  onRms?: (speaker: Speaker, rms01: number) => void; // 0-1に正規化したい場合は呼び出し側で
};

type PerSpeakerRuntime = {
  speaker: Speaker;
  stream: MediaStream;
  audioCtx: AudioContext;
  source: MediaStreamAudioSourceNode;
  worklet: AudioWorkletNode;
  dest: MediaStreamAudioDestinationNode;
  recorder: MediaRecorder;
  recording: boolean;
  recordingStartAtMs: number | null;
  shouldDiscard: boolean;
  collisionFlagForThisSegment: boolean;
  chunks: Blob[];
  vadSpeaking: boolean;
  vadStartAtMs: number | null;
};

function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const c of candidates) {
    const mediaRecorderCtor = window.MediaRecorder;
    if (typeof mediaRecorderCtor?.isTypeSupported === "function") {
      if (mediaRecorderCtor.isTypeSupported(c)) return c;
    }
  }
  return undefined;
}

async function stt(
  blob: Blob,
  meta: {
    speaker: Speaker;
    start_at: number;
    duration_ms: number;
    sample_rate_hz?: number;
  },
) {
  const fd = new FormData();
  fd.append("audio", blob, "speech.webm");
  fd.append("speaker", meta.speaker);
  fd.append("start_at", String(meta.start_at));
  fd.append("duration_ms", String(meta.duration_ms));
  if (typeof meta.sample_rate_hz === "number") {
    fd.append("sample_rate_hz", String(meta.sample_rate_hz));
  }

  const res = await fetch("/api/stt", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`STT request failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return typeof data.text === "string" ? data.text : "failed STT";
}

export async function startShitagoshirae(
  opts: StartOptions,
): Promise<() => void> {
  const startThreshold = opts.startThreshold ?? 0.5;
  const endThreshold = opts.endThreshold ?? 0.3;
  const hangoverMs = opts.hangoverMs ?? 500;
  const minSpeechMs = opts.minSpeechMs ?? 150;
  const maxSpeechMs = opts.maxSpeechMs ?? 10000;
  const collisionHoldMs = opts.collisionHoldMs ?? 500;

  const mimeType = pickMimeType();

  const audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule("/audio-worklets/vad-processor.js");

  const makeOne = async (
    speaker: Speaker,
    deviceId: string,
  ): Promise<PerSpeakerRuntime> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        // OS/ブラウザ内蔵の前処理（自前NRはWorklet内で後日）
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      },
    });

    const source = audioCtx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(audioCtx, "vad-processor", {
      processorOptions: {
        startThreshold,
        endThreshold,
        hangoverMs,
        minSpeechMs,
        maxSpeechMs,
      },
    });

    // Worklet出力を録音対象へ（加工を反映させたいのでDestinationに繋ぐ）
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(worklet);
    worklet.connect(dest);

    const recorder = new MediaRecorder(
      dest.stream,
      mimeType ? { mimeType } : undefined,
    );

    const rt: PerSpeakerRuntime = {
      speaker,
      stream,
      audioCtx,
      source,
      worklet,
      dest,
      recorder,
      recording: false,
      recordingStartAtMs: null,
      shouldDiscard: false,
      collisionFlagForThisSegment: false,
      chunks: [],
      vadSpeaking: false,
      vadStartAtMs: null,
    };

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) rt.chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const startedAt = rt.recordingStartAtMs;
      rt.recording = false;
      rt.recordingStartAtMs = null;

      const blob = new Blob(rt.chunks, {
        type: recorder.mimeType || "audio/webm",
      });
      rt.chunks = [];

      // 破棄指示があれば捨てる
      if (rt.shouldDiscard || startedAt === null) {
        rt.shouldDiscard = false;
        rt.collisionFlagForThisSegment = false;
        return;
      }

      const endAt = Date.now();
      const startAt = startedAt;
      const duration_ms = Math.max(0, endAt - startAt);

      let text = "failed STT";
      try {
        text = await stt(blob, {
          speaker: rt.speaker,
          start_at: startAt,
          duration_ms,
          sample_rate_hz: rt.audioCtx.sampleRate,
        });
      } catch {
        text = "failed STT";
      }

      const packet: MsgPacketType = {
        uuid: crypto.randomUUID(),
        speaker: rt.speaker,
        start_at: new Date(startAt),
        duration_ms,
        volume: rtLastAvgRms.get(rt.speaker) ?? 0,
        text,
        is_collision: rt.collisionFlagForThisSegment,
      };

      // 次セグメントへ向けてクリア
      rt.collisionFlagForThisSegment = false;

      opts.onPacket(packet);
    };

    return rt;
  };

  // speaker別の最新avgRMS（speech_endで更新）
  const rtLastAvgRms = new Map<Speaker, number>();

  const p1 = await makeOne("player1", opts.micDeviceIdBySpeaker.player1);
  const p2 = await makeOne("player2", opts.micDeviceIdBySpeaker.player2);

  // collision coordinator
  let overlapTimer: number | null = null;

  // const getOther = (s: Speaker) => (s === "player1" ? p2 : p1);
  // const getSelf = (s: Speaker) => (s === "player1" ? p1 : p2);

  const clearOverlapTimer = () => {
    if (overlapTimer !== null) {
      window.clearTimeout(overlapTimer);
      overlapTimer = null;
    }
  };

  const checkOverlapStart = () => {
    if (p1.vadSpeaking && p2.vadSpeaking) {
      if (overlapTimer === null) {
        overlapTimer = window.setTimeout(() => {
          overlapTimer = null;
          // 0.5s経ってもまだ被ってるならcollision確定
          if (!(p1.vadSpeaking && p2.vadSpeaking)) return;

          const t1 = p1.vadStartAtMs ?? 0;
          const t2 = p2.vadStartAtMs ?? 0;

          const earlier = t1 <= t2 ? p1 : p2;
          const later = t1 <= t2 ? p2 : p1;

          // 先に始まった方を捨てる（強制終了 → recorder stopで破棄）
          earlier.shouldDiscard = true;
          try {
            earlier.worklet.port.postMessage({ type: "force_end" });
          } catch {
            // ignore
          }
          if (earlier.recording && earlier.recorder.state === "recording") {
            earlier.recorder.stop();
          }

          // 後に始まった方は継続 + collisionフラグ
          later.collisionFlagForThisSegment = true;
        }, collisionHoldMs);
      }
    } else {
      clearOverlapTimer();
    }
  };

  const attachVad = (rt: PerSpeakerRuntime) => {
    rt.worklet.port.onmessage = (e) => {
      const msg = e.data as { type?: string; value?: number; avgRms?: number };
      if (!msg || typeof msg.type !== "string") return;

      if (msg.type === "rms") {
        if (typeof msg.value === "number") opts.onRms?.(rt.speaker, msg.value);
        return;
      }

      if (msg.type === "speech_start") {
        rt.vadSpeaking = true;
        rt.vadStartAtMs = Date.now();

        rt.shouldDiscard = false;
        rt.collisionFlagForThisSegment = false;

        if (!rt.recording && rt.recorder.state !== "recording") {
          rt.chunks = [];
          rt.recording = true;
          rt.recordingStartAtMs = rt.vadStartAtMs;
          rt.recorder.start();
        }

        checkOverlapStart();
        return;
      }

      if (msg.type === "speech_end") {
        rt.vadSpeaking = false;
        rt.vadStartAtMs = null;

        if (typeof msg.avgRms === "number") {
          // RMSは理論上0-1を想定（worklet側は未正規化なので環境次第。要調整）
          rtLastAvgRms.set(rt.speaker, Math.max(0, Math.min(1, msg.avgRms)));
        }

        clearOverlapTimer();

        if (rt.recording && rt.recorder.state === "recording") {
          rt.recorder.stop();
        }
        return;
      }
    };
  };

  attachVad(p1);
  attachVad(p2);

  // iOS Safari対策など：ユーザー操作なしだとsuspendのままになることがある
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {
      // ignore
    }
  }

  return () => {
    clearOverlapTimer();

    for (const rt of [p1, p2]) {
      try {
        rt.worklet.port.postMessage({ type: "force_end" });
      } catch {
        // ignore
      }
      try {
        if (rt.recorder.state === "recording") rt.recorder.stop();
      } catch {
        // ignore
      }
      try {
        rt.source.disconnect();
      } catch {
        // ignore
      }
      try {
        rt.worklet.disconnect();
      } catch {
        // ignore
      }
      for (const track of rt.stream.getTracks()) track.stop();
    }

    audioCtx.close().catch(() => {});
  };
}
