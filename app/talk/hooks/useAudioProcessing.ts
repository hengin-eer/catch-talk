"use client";

import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { startShitagoshirae } from "@/lib/audio/shitagoshirae";
import { micDeviceState } from "@/state/micDeviceState";
import { msgPacketArrayState } from "@/state/msgPacketState";

export function useAudioProcessing() {
  const [micDevice] = useAtom(micDeviceState);
  const [, setPackets] = useAtom(msgPacketArrayState);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = Boolean(micDevice.mic1 && micDevice.mic2);

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
          hangover_ms: 500,
          collisionHold_ms: 500,
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

  return {
    running,
    setRunning,
    error,
    canStart,
  };
}
