export type MsgPacketType = {
  uuid: string; // UUID
  speaker: "player1" | "player2";
  start_at: number; // 発話開始時刻 (Unix time)
  duration_ms: number; // 発話していた時間 (ミリ秒)
  volume: number; // 発話中の音量 (0.0 - 1.0)
  text: string; // 音声認識されたテキスト
};

export type TextArrayType = {
  text: string; // 音声認識されたテキスト
  speaker: "player1" | "player2";
};

export type ruleResponseType = {
  spead: number; // 話すスピード
  is_quiet: boolean; // そのターンの前に沈黙が検出されたか
  talk_length: number; // そのターンの発話長さ (ミリ秒)
};

export type gptResponseType = {
  type: string; // 球種 // TODO: 特定の文字列のみにする
  course: string; // コース // TODO: 特定の文字列のみにする
};

export type pitchChartType = {
  // ruleResponse
  spead: number;
  is_quiet: boolean;
  talk_length: number;
  // gptResponse
  type: string;
  course: string;
};

// jotaiの状態管理用
export type textLogArrayStateType = TextArrayType[];

export type pitchLosStateType = pitchChartType[];
