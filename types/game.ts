import type { CourseType } from "./animation";

export type MsgPacketType = {
  uuid: string; // UUIDv7
  speaker: "player1" | "player2";
  start_at: Date; // 発話開始時刻（Unix Epoch ミリ秒）
  duration_ms: number; // 発話長（ミリ秒）
  volume: number; // 音量（0.0〜1.0）
  text: string; // STT出力
  is_collision: boolean; // 他者との発話重複フラグ
};

export type RuleBasedResult = {
  packetId: string; // MsgPacketType.uuid と紐付け
  speed: number; // 球速 (km/h)
  is_silent: boolean; // 沈黙フラグ（ヤジ演出用）
  is_fire: boolean; // 火の玉フラグ（音量由来）
  ball_scale: number; // ボールの大きさ倍率（文量由来、標準1.0）
};

export type GptBasedResult = {
  pitchType: PitchType; // 変化球
  tension: number; // 会話のテンション -1.0（低い）〜1.0（高い）
  communicationStyle: number; // コミュニケーションスタイル -1.0（議論・解決志向）〜1.0（共感・受容志向）
};

export type PitchType =
  | "straight"
  | "slider"
  | "curve"
  | "knuckle"
  | "fork"
  | "null";

type BasePitchData = {
  uuid: string; // UUIDv7
  speed: number; // 球速 (km/h)
  type: PitchType;
  is_silent: boolean; // 沈黙フラグ
  is_fire: boolean; // 火の玉フラグ
  ball_scale: number; // ボールの大きさ
  text?: string; // 発話内容
  speaker?: "player1" | "player2"; // 話者
};

/**
 * 3Dモデル用
 */
export type PitchData3D = BasePitchData & {
  course: CourseType;
};

/**
 * 配球チャート用
 */
export type PitchDataChart = BasePitchData & {
  coordinate: {
    x: number; // -1.0 ~ 1.0
    y: number; // -1.0 ~ 1.0
  };
};

export type Message = {
  speaker: "player1" | "player2";
  text: string;
};

export type PitchHistoryItem = PitchDataChart;
