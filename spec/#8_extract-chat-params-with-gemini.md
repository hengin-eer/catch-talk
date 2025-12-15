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

**実装方針:**
受け取った `messages` 配列を以下のように処理する。
1. 配列の最後の要素を `targetMessage` (解析対象) とする。
2. それ以外の要素を `historyMessages` (文脈) とする。
3. プロンプト内で `historyMessages` を "Context" として、`targetMessage` を "Input" として展開する。

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
  - [x] **入力インターフェースの変更対応 (`Message[]`)**
  - [x] **プロンプトエンジニアリング (Speaker情報の反映)**
  - [x] JSON Schemaの定義と適用
  - [x] エラーハンドリング
- [x] テストコードの実装
  - [x] Vitestの導入
  - [x] **統合テストの修正 (入力形式の変更)**
  - [x] CIでの実行設定 (必要であれば)
