## 1. 概要
現在の `shitagoshirae.ts` は、マイク入力、VAD（発話区間検出）、録音、STT（音声認識）、衝突判定、状態管理など多岐にわたる責務を単一ファイルで負っている。
本リファクタリングでは、これらを適切な粒度のモジュールに分割し、保守性と拡張性を高めることを目的とする。また、API Route から Server Actions への移行、および状態管理の疎結合化を行う。

## 2. モジュール分割方針
以下の役割ごとにクラスまたは関数として切り出す。

### 2.1. AudioCapture (音声入力管理)
*   **責務**: `navigator.mediaDevices.getUserMedia` のラッパー。
*   **機能**:
    *   指定された `deviceId` でのストリーム取得。
    *   ストリームのクリーンアップ（トラック停止）。

### 2.2. NoiseReductionProcessor (ノイズ除去)
*   **責務**: noiseReduction.ts をラップし、Web Audio API ノードチェーンとして機能させる。
*   **機能**:
    *   HPF (High Pass Filter), LPF (Low Pass Filter) の適用。
    *   ノイズゲート処理（無音時のフロアノイズカット）。
    *   コンプレッサー処理（音量均一化）。
    *   **配置**: AudioCapture の直後に配置し、VAD と Recorder には除去後の音声を渡す。

### 2.3. VADProcessor (発話区間検出)
*   **責務**: `AudioWorklet` との通信および VAD イベントの抽象化。
*   **機能**:
    *   Worklet のロードと初期化。
    *   `speech_start`, `speech_end` イベントの発火。
    *   RMS（音量）データの通知（UI描画用）。
    *   パラメータ設定（閾値、ハングオーバー時間など）。

### 2.4. AudioRecorder (録音管理)
*   **責務**: `MediaRecorder` の制御。
*   **機能**:
    *   VAD イベントに連動した録音の開始・停止。
    *   Blob の生成。
    *   適切な MIME Type の選択。

### 2.5. STTClient (音声認識クライアント)
*   **責務**: サーバーサイドの音声認識機能へのインターフェース。
*   **変更点**: 従来の `fetch('/api/stt')` から、Server Actions の呼び出しに変更する。

### 2.6. ConversationCoordinator (全体制御)
*   **責務**: 上記モジュールを統括し、`MsgPacketType` を生成する。
*   **機能**:
    *   Player1, Player2 のインスタンス管理。
    *   **衝突判定 (Collision Detection)**: 双方の発話タイミングを監視し、重複時の破棄・フラグ付与を行う。
    *   最終的なパケット生成とコールバック呼び出し。

## 3. Server Actions への移行
### 3.1. 方針
*   route.ts を廃止し、`app/actions/transcribe.ts` (仮) を作成する。
*   セキュリティ上の懸念はない（Server Actions もサーバー環境で実行されるため、API Route と同等の機密性が保たれる）。

### 3.2. インターフェース
*   **Input**: `FormData` (Audio Blob, Sample Rate, Encoding 等を含む)。
*   **Output**: `{ text: string, error?: string }`。
*   **メリット**: クライアント・サーバー間の型共有が容易になり、ボイラープレートコードを削減できる。

## 4. 戻り値と状態管理 (Jotai との分離)
### 4.1. 方針
*   `shitagoshirae` (または `ConversationCoordinator`) は **Jotai に依存しない**。
*   `MsgPacketType` は「状態」ではなく「イベントデータ」として扱う。

### 4.2. データフロー設計
1.  **Coordinator (Producer)**:
    *   パケット生成時に `onPacket(packet: MsgPacketType)` をコールバックするのみ。
    *   戻り値としてパケットを返すことはしない（非同期イベントのため）。

2.  **React Hook / Consumer**:
    *   Coordinator からパケットを受け取った瞬間に、以下の処理へ分岐させる。
        *   **A. パラメータ生成 (Logic)**: パケットをルールベース/AI関数に渡し、ゲームパラメータ (`pitchChartType` 等) を生成。**この結果を Jotai (Game State) に保存する。**
        *   **B. ログ表示 (UI)**: 必要であれば、パケット自体を `textLogArrayState` (Jotai) に追加する。これはあくまで「表示用」であり、ロジック計算には使用しない。

これにより、中間データであるパケットが不必要にグローバルステートを汚染することを防ぐ。

## 5. パフォーマンスとパラメータ取得
### 5.1. パフォーマンス考慮事項
*   **ノイズ除去の負荷**: `ScriptProcessorNode` を使用しているため、メインスレッドへの負荷に注意する。将来的に `AudioWorklet` 化を検討するが、まずは現状のモジュールを組み込む。
*   **レイテンシ**: VAD の `speech_end` 検知から STT リクエスト送信までのオーバーヘッドを最小化する。

### 5.2. パラメータ取得 (`MsgPacketType` へのマッピング)
*   **volume**: VADProcessor から通知される RMS の最大値または平均値を使用。
*   **duration_ms**: VAD の `start` と `end` のタイムスタンプ差分から算出。
*   **text**: Server Actions の結果を使用。
*   **is_collision**: Coordinator 内の衝突判定ロジックにより決定。

## 6. ディレクトリ構成案 (lib/audio/)
```
lib/audio/
├── capture.ts       # AudioCapture
├── noise.ts         # NoiseReductionProcessor (Wrapper of utils/noiseReduction.ts)
├── vad.ts           # VADProcessor
├── recorder.ts      # AudioRecorder
├── stt.ts           # STTClient (Server Action wrapper)
├── coordinator.ts   # ConversationCoordinator (Main logic)
└── types.ts         # Audio related types
```
