export type MsgPacketType = {
  uuid: string; // UUID
  speaker: "player1" | "player2";
  start_at: Date; // 発話開始時刻 (Unix time)
  duration_ms: number; // 発話していた時間 (ミリ秒)
  volume: number; // 発話中の音量 (0.0 - 1.0)
  text: string; // 音声認識されたテキスト
  is_collision: boolean; // 相手と話が被ったか
};

export type TextArrayType = {
  text: string; // 音声認識されたテキスト
  speaker: "player1" | "player2";
};

export type ruleResponseType = {
  spead: number | null; // 話すスピード
  is_quiet: boolean | null; // そのターンの前に沈黙が検出されたか
  talk_length: number | null; // そのターンの発話長さ (ミリ秒)
  is_collision: boolean | null; // 相手と話が被ったか
};

export type gptResponseType = {
  type: string | null; // 球種 // TODO: 特定の文字列のみにする
  course: string | null; // コース // TODO: 特定の文字列のみにする
};

export type pitchChartType = {
  // ruleResponse
  spead: number | null;
  is_quiet: boolean | null;
  talk_length: number | null;
  is_collision: boolean | null;
  // gptResponse
  type: string | null;
  course: string | null;
};

// jotaiの状態管理用
export type textLogArrayStateType = TextArrayType[];

export type pitchLosStateType = pitchChartType[];
