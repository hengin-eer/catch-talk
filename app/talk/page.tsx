"use client";

import { useAtomValue } from "jotai";
import PitchingView from "@/components/3d/PitchingView";
import { ChatAnalysisDebug } from "@/components/debug/ChatAnalysisDebug";
import { messagesState } from "@/state/gameData";
import { useChat } from "./hooks/useChat";

export default function TalkPage() {
  const messages = useAtomValue(messagesState);
  const { running, setRunning, error, canStart, clearLogs, isSilent } =
    useChat();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>
        Talk (useChat Integration)
      </h1>
      {/* 3Dアニメーションの実装 */}
      <PitchingView />

      {!canStart && (
        <p style={{ color: "#c00" }}>
          mic1/mic2 が未選択。先にトップ画面でマイクを選択してから来る想定。
        </p>
      )}

      {error && <p style={{ color: "#c00" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          disabled={!canStart || running}
          onClick={() => setRunning(true)}
        >
          Start
        </button>
        <button
          type="button"
          disabled={!running}
          onClick={() => setRunning(false)}
        >
          Stop
        </button>
        <button
          type="button"
          disabled={running || messages.length === 0}
          onClick={clearLogs}
        >
          Clear
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>Messages</h2>
        <p style={{ fontSize: 12, color: "#666" }}>
          ※デバッグ表示は右下のパネルを確認してください
        </p>
      </div>

      <ChatAnalysisDebug isSilent={isSilent} />
    </div>
  );
}
