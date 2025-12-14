## 概要
- STTで得たテキストから会話成分を抽出するAPIの実装
- Gemini API (`gemini-2.5-flash`) を利用する
  - リアルタイム性を重視し、軽量モデルを採用
- 以下の2軸で会話成分を抽出する。いずれも連続値
  - テンションの高さ (-1.0: 低い/沈静 ~ 1.0: 高い/興奮)
  - 会話スタイル (-1.0: 議論/解決志向 ~ 1.0: 共感/受容志向)
- 抽出結果はJSONで返す
  - Geminiの `responseSchema` 機能を利用して型安全に取得する

## インターフェース設計

### Input
- `text`: string (解析対象の発話テキスト)
- `history`: string[] (オプション: 直近の会話履歴数件。文脈理解用)

### Output (JSON Schema)
```json
{
  "tension": { "type": "number", "description": "Range: -1.0 to 1.0" },
  "communicationStyle": { "type": "number", "description": "Range: -1.0 (Discussion) to 1.0 (Empathy)" }
}
```

## テスト方針
- **単体テスト (Unit Test)**
  - 純粋なロジック（プロンプト生成など、外部依存のない部分）は、実装ファイルと同じディレクトリに `*.test.ts` として配置する。
- **統合テスト (Integration Test)**
  - 外部API (Gemini API) や Server Actions を含むテストは、`test/` ディレクトリ配下に配置する。
  - 例: `test/actions/analyzeChat.test.ts`
  - 実行には `.env.local` に `GEMINI_API_KEY` が必要。

## タスク
- [x] パッケージ追加
  - [x] `npm install @google/generative-ai`
- [x] Gemini APIクライアント実装 (Server Actions)
  - [x] `gemini-2.5-flash` モデルの初期化
  - [x] プロンプトエンジニアリング (System Instructionの調整)
  - [x] JSON Schemaの定義と適用
  - [x] エラーハンドリング (API制限、不適切コンテンツ判定など)
- [x] テストコードの実装
  - [x] Vitestの導入
  - [x] 統合テストの実装 (`test/actions/analyzeChat.test.ts`)
  - [x] CIでの実行設定 (必要であれば)
