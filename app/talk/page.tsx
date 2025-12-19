"use client";

import { useAtomValue } from "jotai";
import PitchingView from "@/components/3d/PitchingView";
import { ChatAnalysisDebug } from "@/components/chart/ChatAnalysis";
import { messagesState } from "@/state/gameData";
import { useChat } from "./hooks/useChat";
import styles from "./page.module.css";

export default function TalkPage() {
  const messages = useAtomValue(messagesState);
  const { running, setRunning, error, canStart, clearLogs, isSilent } =
    useChat();

  return (
    <main className={styles.page}>
      <PitchingView />

      <div className={styles.bottomNavigation}>
        <div className={styles.messageBox}>
          {!canStart && (
            <p className={styles.chooseMicWarning}>
              おっと！ まずは使うマイクを2本選んでください！
            </p>
          )}
        </div>

        {error && <p className={styles.chooseMicWarning}>{error}</p>}

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
      </div>

      <ChatAnalysisDebug isSilent={isSilent} />
    </main>
  );
}
