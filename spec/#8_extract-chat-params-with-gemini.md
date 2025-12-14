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
以下のオブジェクトの配列を受け取る。
配列の**最後の要素**を解析対象とし、それ以前の要素は文脈（Context）として利用する。

```ts
type Speaker = "player1" | "player2";

type Message = {
  speaker: Speaker;
  text: string;
}

// Server Actionの引数
messages: Message[]
```

`text`がオブジェクト配列のため、これをパースして会話履歴の変数を生成しても良いか？

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
- [ ] Gemini APIクライアント実装 (Server Actions)
  - [x] `gemini-2.5-flash` モデルの初期化
  - [ ] **入力インターフェースの変更対応 (`ChatMessage[]`)**
  - [ ] **プロンプトエンジニアリング (Speaker情報の反映)**
  - [x] JSON Schemaの定義と適用
  - [x] エラーハンドリング
- [ ] テストコードの実装
  - [x] Vitestの導入
  - [ ] **統合テストの修正 (入力形式の変更)**
  - [x] CIでの実行設定 (必要であれば)
