"use client";

import { useAtomValue } from "jotai";
import { Mic, MicOff, RotateCcw } from "lucide-react";
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

        <div className={styles.buttonNavigation}>
          <button
            type="button"
            className={styles.toggleButton}
            disabled={!running && !canStart}
            onClick={() => setRunning(!running)}
          >
            {running ? <MicOff className={styles.micOff} /> : <Mic />}
          </button>
          <button
            type="button"
            className={styles.clearButton}
            disabled={running || messages.length === 0}
            onClick={clearLogs}
          >
            <RotateCcw className={styles.rotateCcw} />
          </button>
        </div>
      </div>

      <ChatAnalysisDebug isSilent={isSilent} />
    </main>
  );
}
