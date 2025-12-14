## 概要
- STTで得たテキストから会話成分を抽出するAPIの実装
- Gemini API (`gemini-1.5-flash`) を利用する
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

## タスク
- [ ] パッケージ追加
  - [ ] `npm install @google/generative-ai`
- [ ] Gemini APIクライアント実装 (Server Actions)
  - [ ] `gemini-1.5-flash` モデルの初期化
  - [ ] プロンプトエンジニアリング (System Instructionの調整)
  - [ ] JSON Schemaの定義と適用
  - [ ] エラーハンドリング (API制限、不適切コンテンツ判定など)
- [ ] テストコードの実装
  - [ ] 典型的な発話パターンでのスコア検証
