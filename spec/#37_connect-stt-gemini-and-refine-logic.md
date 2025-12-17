# #39 STTとGeminiの連携およびロジックの改善

## 概要
STT（音声認識）の結果をGeminiによる会話分析（`analyzeChat`）に利用できるようにするため、会話履歴（`Message[]`）の状態管理を実装する。
また、`useChat`フックの責務として、ルールベースの計算結果（`RuleBasedResult`）とAI分析結果（将来的に`GptBasedResult`）を統合し、ゲーム描画用の`PitchData3D`および`PitchDataChart`の状態を管理することをゴールとする。
併せて、音量（Volume）のバグ修正・調整と、沈黙判定ロジックの刷新を行う。

## 設計

### 1. 状態管理の強化 (`useChat` / Jotai)

以下の新しいAtom（または`useChat`内での管理）を導入する。

*   **`messagesState`**: `Message[]`
    *   Geminiのコンテキストとして使用する会話履歴。
    *   `MsgPacketType`が生成されるたびに、`{ speaker, text }` を抽出して追加する。
*   **`pitchData3DState`**: `PitchData3D[]`
    *   3D投球演出用データ。
    *   `RuleBasedResult`（即時算出）と`GptBasedResult`（非同期算出）をマージして生成する。
    *   ※現時点ではGemini連携は「会話履歴の蓄積」までをスコープとし、`GptBasedResult`がまだない場合はデフォルト値（例: ストレート、ど真ん中）または仮のロジックで埋める形とするか、非同期更新の仕組みを準備する。
*   **`pitchDataChartState`**: `PitchDataChart[]`
    *   配球チャート用データ。
    *   `PitchData3D`と同様に生成・管理する。

### 2. ロジックの改善

#### A. 音量（Volume）の修正と調整
*   **バグ修正**: `vad-processor.js`にて、入力バッファ長が0の場合にゼロ除算（0/0）が発生し、RMSが`NaN`になる可能性があるためガード節を追加する。
*   **閾値調整**: 現在の音量傾向（0.1前後）に対し、`is_fire`の閾値（0.8）が高すぎるため、**0.2**（暫定）に引き下げる。

> 体感として、声を張ったらFire判定が出るレベルになってると思う
> 一回もFireにならなかったけど...

#### B. 沈黙判定（Silence）の刷新
*   **現状**: テキストが空かどうかで判定しているが、STTの仕様上不正確。
*   **新仕様**: 「会話間隔が5秒以上空いた」ことを沈黙とする。
*   **実装**:
    *   `useChat`内でタイマー（`setTimeout`）を使用。
    *   新しいパケット（発話）が来るたびにタイマーをリセット。
    *   5秒間パケットが来なかった場合、**沈黙を表す`RuleBasedResult`**を生成してStateに追加する。
    *   沈黙イベントには対応する音声パケットが存在しないため、`packetId`には専用のUUIDを発行する。
    *   `is_silent: true` 以外のパラメータ（speed, ball_scale等）はデフォルト値（0や1.0）とする。

#### C. ノイズ除去の強化（突発音・高周波対策）
*   **課題**: マイク感度を上げると、物の落下音や高周波ノイズを誤検知してしまう。
*   **対策**:
    *   **バンドパスフィルタの調整**: 人の声の帯域（一般的に300Hz〜3400Hz程度）に絞り込むため、HPF/LPFの周波数を調整する。
    *   **突発音フィルタ（Slew Rate Limiter的な処理）**: 急激な音量変化（アタックが鋭すぎる音）を抑制、またはVAD側で「短すぎるかつ急激な音」を弾くロジックを検討する。
    *   **実装場所**: `lib/audio/noiseReduction.ts` または `vad-processor.js`。

## タスクリスト

- [ ] **State定義**: `state/gameData.ts` (新規または既存) に `messagesState`, `pitchData3DState`, `pitchDataChartState` を定義する。
- [ ] **VAD修正**: `public/audio-worklets/vad-processor.js` の `NaN` 対策を行う。
- [ ] **Volume調整**: `lib/rulebase/volume.ts` の `FIRE_VOLUME_THRESHOLD` を `0.2` に変更する。
- [ ] **useChat実装**:
    - [ ] `messagesState` の更新処理を追加。
    - [ ] 沈黙判定タイマー（5秒ルール）の実装。
    - [ ] `PitchData3D` / `PitchDataChart` の生成と更新処理の実装（まずはRuleBasedResultのみで構成し、足りない項目はデフォルト値で埋める）。
- [ ] **動作確認**:
    - [ ] 音量が正しく数値で取得できること。
    - [ ] 小さい声でも（設定した閾値を超えれば）Fire判定になること。
    - [ ] 5秒放置すると沈黙判定（ヤジ演出用データ）が生成されること。
- [ ] **ノイズ除去調整**:
    - [ ] `noiseReduction.ts` のフィルタ周波数調整（人の声に最適化）。
    - [ ] 必要に応じてVADの感度調整。
