import type { VADConfig } from "./types";

type VADEventMap = {
  speech_start: () => void;
  speech_end: (avgRms: number) => void;
  rms: (rms: number) => void;
};

export class VoiceActivityDetector {
  private worklet: AudioWorkletNode | null = null;
  private listeners: Partial<VADEventMap> = {};

  constructor(
    private ctx: AudioContext,
    private config: VADConfig,
  ) {}

  async initialize() {
    try {
      await this.ctx.audioWorklet.addModule("/audio-worklets/vad-processor.js");
    } catch (e) {
      // 既にロードされている場合は無視、あるいはエラーハンドリング
      console.warn("VAD module load failed (maybe already loaded):", e);
    }

    this.worklet = new AudioWorkletNode(this.ctx, "vad-processor", {
      processorOptions: {
        startThreshold: this.config.startThreshold,
        endThreshold: this.config.endThreshold,
        hangoverMs: this.config.hangover_ms,
        minSpeechMs: this.config.minSpeech_ms,
        maxSpeechMs: this.config.maxSpeech_ms,
      },
    });

    this.worklet.port.onmessage = (event) => {
      const { type, value } = event.data;
      if (type === "speech_start") {
        this.listeners.speech_start?.();
      } else if (type === "speech_end") {
        this.listeners.speech_end?.(value); // value is avgRms
      } else if (type === "rms") {
        this.listeners.rms?.(value);
      }
    };
  }

  connect(source: AudioNode): AudioNode {
    if (!this.worklet) throw new Error("VADProcessor not initialized");
    source.connect(this.worklet);
    return this.worklet;
  }

  on<K extends keyof VADEventMap>(event: K, listener: VADEventMap[K]) {
    this.listeners[event] = listener;
  }

  disconnect() {
    if (this.worklet) {
      this.worklet.disconnect();
      this.worklet = null;
    }
  }

  forceEnd() {
    if (this.worklet) {
      this.worklet.port.postMessage({ type: "force_end" });
    }
  }

  getNode(): AudioWorkletNode | null {
    return this.worklet;
  }
}
