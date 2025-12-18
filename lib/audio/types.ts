import type { MsgPacketType } from "@/types/game";

export type Speaker = "player1" | "player2";

export type AudioConfig = {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
};

export type VADConfig = {
  startThreshold: number;
  endThreshold: number;
  hangover_ms: number;
  minSpeech_ms: number;
  maxSpeech_ms: number;
};

export type RecorderConfig = {
  mimeType?: string;
};

export type CoordinatorConfig = {
  micDeviceIdBySpeaker: Record<Speaker, string>;
  vad?: Partial<VADConfig>;
  recorder?: RecorderConfig;
  collisionHold_ms?: number;
  onPacket: (packet: MsgPacketType) => void;
  onRms?: (speaker: Speaker, rms01: number) => void;
  onVADStateChange?: (speaker: Speaker, isSpeaking: boolean) => void;
};
