"use client";

import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { startShitagoshirae } from "@/lib/audio/shitagoshirae";
import { micDeviceState } from "@/state/micDeviceState";
import { msgPacketArrayState } from "@/state/msgPacketState";

export default function TalkPage() {
  const [micDevice] = useAtom(micDeviceState);
  const [packets, setPackets] = useAtom(msgPacketArrayState);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = useMemo(
    () => Boolean(micDevice.mic1 && micDevice.mic2),
    [micDevice],
  );

  useEffect(() => {
    if (!running) return;
    if (!micDevice.mic1 || !micDevice.mic2) return;

    const mic1 = micDevice.mic1;
    const mic2 = micDevice.mic2;

    let stop: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        stop = await startShitagoshirae({
          micDeviceIdBySpeaker: { player1: mic1, player2: mic2 },
          startThreshold: 0.3,
          endThreshold: 0.01,
          hangoverMs: 500,
          collisionHoldMs: 500,
          onPacket: (p) => {
            if (cancelled) return;
            setPackets((prev) => [p, ...prev].slice(0, 50));
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed to start");
        setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [running, micDevice.mic1, micDevice.mic2, setPackets]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>Talk</h1>

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
