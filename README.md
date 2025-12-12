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

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
