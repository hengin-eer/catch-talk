import { useEffect, useRef, useState } from "react";

/**
 * @param lastActivityTime 最後のパケット受信時刻など、アクティビティがあった時刻 (Unix Epoch ms)
 * @param thresholdMs 沈黙と判定するまでの閾値 (ms)
 */
export function useSilence(
  lastActivityTime: number | null,
  thresholdMs: number = 5000,
) {
  const [isSilent, setIsSilent] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // まだアクティビティがない場合は判定しない
    if (lastActivityTime === null) {
      setIsSilent(false);
      return;
    }

    // アクティビティがあったので沈黙解除
    setIsSilent(false);

    // 既存タイマーのクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 新規タイマーセット
    timerRef.current = setTimeout(() => {
      setIsSilent(true);
    }, thresholdMs);

    // クリーンアップ
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [lastActivityTime, thresholdMs]);

  return { isSilent };
}
