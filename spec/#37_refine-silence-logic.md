# #37 沈黙判定ロジックの刷新と状態管理への移行

## 概要
現在の沈黙判定ロジックでは、沈黙検知時に「沈黙パケット」を生成して `PitchData` の履歴に追加している。
これを改め、沈黙を「現在の状態（State）」として扱い、UI側でリアルタイムに演出を出し分けられるようにする。
また、ロジックを `useChat` から分離し、疎結合なカスタムフックとして実装する。

## 変更点

### 1. 沈黙の扱い
*   **Before**: 5秒間無音だと、`PitchData3D` / `PitchDataChart` 配列に「沈黙」を表すダミーデータが追加される。
*   **After**: 配列への追加は行わない。代わりに `isSilent` という真偽値をフックから返す。

### 2. 判定ロジック
*   **監視基準**: メッセージパケット（`MsgPacketType`）自体のタイムスタンプは不変であるため、これとは別に「最後にアクティビティ（発話受信）があった時刻」をStateとして管理し、これを監視基準とする。
*   **判定**: 最後のパケット受信（アクティビティ更新）から一定時間（`SILENCE_THRESHOLD_MS = 5000`）経過した場合に `isSilent = true` とする。
*   **リセット**: 新しいパケットを受信した時点で `isSilent = false` に戻り、タイマーをリセットする。

## 設計

### 新規フック: `useSilence`
`app/talk/hooks/useSilence.ts` を新規作成する。

#### インターフェース
```typescript
/**
 * 沈黙判定フック
 * @param lastActivityTime 最後のパケット受信時刻など、アクティビティがあった時刻 (Unix Epoch ms)
 * @param thresholdMs 沈黙と判定するまでの閾値 (ms)
 */
export function useSilence(lastActivityTime: number | null, thresholdMs: number = 5000) {
  // ...
  return { isSilent };
}
```

#### 内部ロジック
1.  `lastActivityTime` が更新されるたびに、既存のタイマーをクリアし、`isSilent` を `false` に設定。
2.  新たに `setTimeout` をセットし、`thresholdMs` 経過後に `isSilent` を `true` に更新する。
3.  コンポーネントのアンマウント時にタイマーをクリアする。

### `useChat` の改修
*   `useSilence` をインポートして使用する。
*   `useAudioProcessing` のコールバック内で、パケット受信時に「最終アクティビティ時刻（`lastActivityTime`）」を `Date.now()` で更新し、それを `useSilence` に渡す。
*   `handleSilence` （ダミーデータ生成処理）を削除する。
*   `useChat` の返り値に `isSilent` を追加する。

## タスク
1.  `app/talk/hooks/useSilence.ts` の実装
2.  `app/talk/hooks/useChat.ts` の修正
    *   `useSilence` の組み込み
    *   旧沈黙ロジックの削除
3.  `components/debug/ChatAnalysisDebug.tsx` の修正（現在の沈黙状態を表示するように変更）
