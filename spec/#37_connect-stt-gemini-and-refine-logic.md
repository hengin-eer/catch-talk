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

#### D. Gemini連携 (analyzeChat)
*   **目的**: 会話の緊張感やコミュニケーションスタイルを分析する。
*   **実装**:
  * `useChat`内で`analyzeChat`サーバーアクションを呼び出す。
  * 呼び出しタイミング: `messagesState`が更新された後（`onPacket`内）。

##### 処理結果の状態管理
- `PitchData3D`: `GptBasedResult`を反映した3Dモデルアニメーション用の投球データを生成・保存。
- `PitchDataChart`: 上と同様に`GptBasedResult`をベースに、配球チャート用座標を反映したデータを生成・保存。

##### コースの設定方法
まず`PitchData3D`では`CourseGrid`型を使用し、以下のようにコースを指定する。
```typescript
export type CourseGrid =
  | "high-inside"
  | "high-center"
  | "high-outside"
  | "mid-inside"
  | "mid-center"
  | "mid-outside"
  | "low-inside"
  | "low-center"
  | "low-outside";
```

`analyzeChat.ts`で得られる`ChatAnalysisResult`型の結果はそれぞれ`-1~1`の連続値の範囲で返されるため、これを上記の9分割グリッドにマッピングするロジックを実装する。

一方`PitchDataChart`では、`x`および`y`座標を`-1.0~1.0`の範囲で直接指定するので、特に変換は不要である。

#### 簡易的なチャートとコースグリッドの表示
`/components/debug/ChatAnalysisDebug.tsx`を新規作成し、以下の内容を実装する。
- `PitchDataChart`型の各プロパティを反映した簡易チャート表示
- `PitchData3D`型の`course`プロパティを反映したコースグリッドのテキスト表示

なお配球チャートには以下のプロパティを反映する。
- `speed`: 投球速度
- `pitch_type`: 変化球の種類
- `is_fire`: 火の玉演出の有無
- `ball_scale`: ボールの大きさ
- `coordinates`: 配球チャート上の`x`, `y`座標

なお座標とチャートの幅はストライクゾーンに合わせて調整するものとし、ボールゾーンに表示はしない。
簡易的に9つのグリッド線を引き、`coordinates`の位置に回数と変化球ごとの図形をプロットする形とする。

変化球ごとの図形は以下の通りとする。
- ストレート: o
- カーブ: c
- スライダー: >
- フォーク: v
- ナックル: ?

## タスクリスト

- [ ] **State定義**: `state/gameData.ts` (新規または既存) に `messagesState`, `pitchData3DState`, `pitchDataChartState` を定義する。
- [ ] **VAD修正**: `public/audio-worklets/vad-processor.js` の `NaN` 対策を行う。
- [ ] **Volume調整**: `lib/rulebase/volume.ts` の `FIRE_VOLUME_THRESHOLD` を `0.2` に変更する。
- [ ] **useChat実装**:
    - [ ] `messagesState` の更新処理を追加。
    - [ ] 沈黙判定タイマー（5秒ルール）の実装。
    - [ ] `PitchData3D` / `PitchDataChart` の生成と更新処理の実装（まずはRuleBasedResultのみで構成し、足りない項目はデフォルト値で埋める）。
    - [ ] `analyzeChat` の呼び出し処理を追加。
- [ ] **動作確認**:
    - [ ] 音量が正しく数値で取得できること。
    - [ ] 小さい声でも（設定した閾値を超えれば）Fire判定になること。
    - [ ] 5秒放置すると沈黙判定（ヤジ演出用データ）が生成されること。
    - [ ] Gemini分析が走り、コンソールに結果が表示されること。
- [ ] **ノイズ除去調整**:
    - [ ] `noiseReduction.ts` のフィルタ周波数調整（人の声に最適化）。
    - [ ] 必要に応じてVADの感度調整。
