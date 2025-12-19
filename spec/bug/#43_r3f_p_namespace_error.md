# R3F: P is not part of the THREE namespace!

## 概要
`components/3d/ScreenContent.tsx` 内の `Suspense` の `fallback` に HTML 要素である `<p>` タグを直接記述していたため、React Three Fiber (R3F) がこれを Three.js のオブジェクトとして解釈しようとし、エラーが発生しました。

## エラー内容
```
R3F: P is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively
```

## 原因
R3F の `Canvas` 内では、標準の HTML タグ（`div`, `p`, `span` など）を直接レンダリングすることはできません。R3F は JSX 要素を Three.js のクラスインスタンス（例: `<mesh>` -> `new THREE.Mesh()`）にマッピングしようとします。`<p>` に対応する `THREE.P` クラスが存在しないため、上記のエラーが発生しました。

## 修正内容
`@react-three/drei` ライブラリの `Html` コンポーネントを使用して、HTML 要素をラップしました。これにより、Canvas 上に HTML オーバーレイとして正しくレンダリングされるようになります。

### 修正前
```tsx
<Suspense fallback={<p>3Dモデルの読み込み中</p>}>
```

### 修正後
```tsx
import { Html } from "@react-three/drei";

// ...

<Suspense
  fallback={
    <Html center>
      <p style={{ color: "white" }}>3Dモデルの読み込み中...</p>
    </Html>
  }
>
```
