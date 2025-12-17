"use client";

import { useAtomValue } from "jotai";
import { msgPacketArrayState } from "@/state/msgPacketState";
import { ruleBasedResultArrayState } from "@/state/ruleBasedResult";
import { useChat } from "./hooks/useChat";

export default function TalkPage() {
  const packets = useAtomValue(msgPacketArrayState);
  const ruleResults = useAtomValue(ruleBasedResultArrayState);
  const { running, setRunning, error, canStart, clearLogs } = useChat();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>
        Talk (useChat Integration)
      </h1>

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
          disabled={running || packets.length === 0}
          onClick={clearLogs}
        >
          Clear
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>Packets & Rules</h2>
        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
          {packets.map((p) => {
            const result = ruleResults.find((r) => r.packetId === p.uuid);
            const speedDisplay = result
              ? `${result.speed.toFixed(1)}km/h`
              : "---";
            const fireDisplay = result?.is_fire ? "🔥" : "";

            return (
              <li key={p.uuid} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {p.start_at.toLocaleTimeString("ja-JP", { hour12: false })} /{" "}
                  {p.speaker} / {p.duration_ms}ms
                </div>
                <div style={{ fontWeight: "bold", color: "#0070f3" }}>
                  {speedDisplay} {fireDisplay}
                </div>
                <div>{p.text}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
