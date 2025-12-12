## 開発環境のセットアップ
このプロジェクトでは、チーム全員が全く同じ Node.js 環境で開発できるように **[Volta](https://volta.sh/)** を導入しています。
「自分の環境だと動かない」というトラブルを防ぐため、以下の手順でセットアップをお願いします。

### Volta のインストール

#### Windows
1. [Volta 公式サイト](https://volta.sh/) にアクセスします。
2. **"Download Windows Installer"** をクリックしてダウンロード・インストールしてください。
3. **【重要】** インストール後、パスを反映させるために**PCを再起動**してください（または開いている VS Code やターミナルをすべて完全に閉じて開き直してください）。

パス反映は恐らく自動で行われますが、もしうまくいかない場合は再起動を試してください。

#### Mac / WSL (Linux) 
ターミナルで以下のコマンドを実行してください。

```bash
curl https://get.volta.sh | bash
```

### VSCodeの拡張機能
開発を楽にするために推奨拡張機能を設定しています。
左側サイドバーの拡張機能から、推奨拡張機能を選択して、以下3つをインストールしてください。
- "biomejs.biome"
- "editorconfig.editorconfig"
- "yoavbls.pretty-ts-errors"

何故か上3つの他に、ブラウザのDevToolsのような拡張機能も推奨に表示されていますが、無視して構いません。

## Gitコマンドちょいまとめ

### 作業の始め方
まず、`main` ブランチに切り替えて、最新の `main` ブランチを取得します。
```bash
git switch main
git pull origin main
```

新しくブランチを切って作業を始めるときは、以下のコマンドを実行してください。
```bash
git switch -c feature/your-feature-name
```

### 変更のコミットとプッシュ
まず用語を整理します。
- **ブランチ**：変更履歴の流れを分岐させるためのもの。各個人用の作業スペース
- **ステージング**：コミットする変更内容を選択すること
- **コミット**：変更内容を履歴として保存すること
- **プッシュ**：ローカルのコミットをリモートリポジトリ（GitHub）に送信すること

基本的にここら辺の操作はVSCode左側のサイドバーにある「ソース管理」から行うことを推奨します。

### コミットメッセージの書き方
コミットメッセージは以下のフォーマットで書いてください。
```
<タイプ>: #<Issue番号> <変更内容の要約>

- 変更内容を詳しく書く（必要に応じて）
- 複数行でもOKE
```

タイプは以下のいずれかを使用してください。

| タイプ | 説明 |
| --- | --- |
| fix | バグ修正 |
| hotfix | クリティカルなバグ修正 |
| add | 新規（ファイル）機能追加 |
| update | 機能修正（バグではない） |
| change | 仕様変更 |
| clean | 整理（リファクタリング等） |
| disable | 無効化（コメントアウト等） |
| remove | 削除（ファイル） |
| upgrade | バージョンアップ |
| revert | 変更取り消し |


## プロジェクトの起動方法

### npmパッケージのインストール
`git clone` でリポジトリをクローンした後、プロジェクトルートで以下のコマンドを実行してください。

また、他のメンバーがパッケージを追加・更新した場合も、同様に以下のコマンドを実行して最新の状態にしてください。

```bash
npm install
```
これにより、`package.json` に記載された Node.js のバージョンが自動的にインストールされ、プロジェクトに必要なパッケージもインストールされます。

### 開発サーバーの起動
開発サーバーを起動するには、以下のコマンドを実行してください。
```bash
npm run dev
```

## コーディング規約
React/TypeScript の文化は、オブジェクト指向（OOP）よりも**関数型プログラミング**の影響を強く受けています。
C++ や C# とは異なる作法がいくつかあるため、以下のルールを意識してください。

明示していない部分は **[Biomae](https://biomejs.dev/)** のデフォルト設定に従います。
Biomeはコードのフォーマットと静的解析を行うツールです。
平たく言えば、コードの書き方を自動で統一してくれるツールです。

### 1. 命名規則 (Naming Conventions)

| 対象 | ケース | 例 | 備考 |
| :--- | :--- | :--- | :--- |
| **コンポーネント** | **PascalCase** | `UserProfile.tsx` | **必須**。Reactは小文字始まりをHTMLタグとみなします。 |
| **関数・変数** | **camelCase** | `getUserData`, `itemList` | C# (PascalCase) との最大の違いです。 |
| **型・Interface** | **PascalCase** | `UserProps`, `ApiResult` | `IUser` のような **"I" プレフィックスは不要**です。 |
| **定数** | **UPPER_SNAKE** | `MAX_COUNT` | グローバルな定数のみ。コンポーネント内定数は camelCase でOK。 |

### 2. 重要なルール

#### 💎 イミュータブル（不変）を徹底する
React の再描画は「オブジェクトの参照変更」で検知されます。中身を直接書き換えてはいけません。

* ❌ `list.push(item);` / `user.name = "New";`
* ⭕ `const newList = [...list, item];` / `const newUser = { ...user, name: "New" };`

#### ⚖️ 等価比較は `===` を使う
* ❌ `if (a == b)` (予期せぬ型変換が起きるため非推奨)
* ⭕ `if (a === b)` (型と値を厳密に比較)

#### ⚠️ 真偽値の判定 (Truthiness) に注意
数値の `0` や空文字 `""` は `false` 扱いになります。
「数値の0を表示したい」場合に `if (count)` と書くと表示されないバグになります。

* ⭕ `if (count !== undefined)` または `if (count != null)`

#### 📦 Export は Named Export を推奨
* ❌ `export default Component;`
* ⭕ `export const Component = () => { ... };`

---

### 🚀 C++/C# 開発者のための早見表

| 概念 | C++ / C# | React / TypeScript |
| :--- | :--- | :--- |
| クラス | `class MyComponent` | `const MyComponent = () => { ... }` (関数コンポーネント) |
| 変数埋め込み | `$"Value: {val}"` | `` `Value: ${val}` `` (バッククォート) |
| 条件分岐 (UI) | `if` 文 | `isShow && <Component />` または三項演算子 |
| インターフェース | `interface IUser` | `type User` (Iはつけない) |
| 非同期 | `Task<T>`, `async/await` | `Promise<T>`, `async/await` |
| Null許容 | `string?` | `string | undefined` (undefinedが基本) |

## テスト構成
このプロジェクトでは、テストの種類によってファイルの配置場所が異なります。
**Vitest** (単体テスト) と **Playwright** (E2Eテスト) を採用しています。

### ディレクトリ構成図

```text
.
├── app/
│   ├── page.tsx
│   └── page.test.tsx     # 📍 ページコンポーネントのテスト（同居）
│
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── Button.test.tsx # 📍 UIパーツの単体テスト（同居）
│
├── lib/
│   └── audio/
│       ├── processor.ts
│       └── processor.test.ts # 📍 ロジックの単体テスト（同居）
│
├── e2e/                      # 🌐 E2Eテスト（ブラウザ操作）
│   ├── auth.spec.ts
│   └── scenario.spec.ts
│
└── tests/                    # 🛠 テスト用の設定・モックデータ
    ├── setup.ts
    └── mocks/
```

