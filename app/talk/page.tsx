"use client";

import { useAtom } from "jotai";
import PitchingView from "@/components/3d/PitchingView"; //3D表示のコンポーネント
import { msgPacketArrayState } from "@/state/msgPacketState";
import { useAudioProcessing } from "./hooks/useAudioProcessing";

export default function TalkPage() {
  const [packets, setPackets] = useAtom(msgPacketArrayState);
  const { running, setRunning, error, canStart } = useAudioProcessing();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>Talk</h1>

      {/* 3Dビューの表示 */}
      <div
        style={{
          flex: 1,
          minHeight: "400px",
          position: "relative",
          border: "1px solid #ccc",
          marginTop: 10,
        }}
      >
        <PitchingView />
      </div>

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
          onClick={() => setPackets([])}
        >
          Clear
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>Packets</h2>
        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
          {packets.map((p) => (
            <li key={p.uuid} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {p.start_at.toLocaleTimeString("ja-JP", { hour12: false })} /{" "}
                {p.speaker} / {p.duration_ms}ms / vol=
                {p.volume.toFixed(2)} / collision={String(p.is_collision)}
              </div>
              <div>{p.text}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
