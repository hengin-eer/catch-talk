"use client";

import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { ConversationCoordinator } from "@/lib/audio/coordinator";
import { micDeviceState } from "@/state/micDeviceState";
import { msgPacketArrayState } from "@/state/msgPacketState";

export function useAudioProcessing() {
  const [micDevice] = useAtom(micDeviceState);
  const [, setPackets] = useAtom(msgPacketArrayState);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coordinatorRef = useRef<ConversationCoordinator | null>(null);

  const canStart = Boolean(micDevice.mic1 && micDevice.mic2);

  useEffect(() => {
    if (!running) {
      if (coordinatorRef.current) {
        coordinatorRef.current.stop();
        coordinatorRef.current = null;
      }
      return;
    }
    if (!micDevice.mic1 || !micDevice.mic2) return;

    const mic1 = micDevice.mic1;
    const mic2 = micDevice.mic2;

    let cancelled = false;

    (async () => {
      try {
        const coordinator = new ConversationCoordinator({
          micDeviceIdBySpeaker: { player1: mic1, player2: mic2 },
          vad: {
            startThreshold: 0.3,
            endThreshold: 0.01,
            hangover_ms: 500,
            minSpeech_ms: 150,
            maxSpeech_ms: 10000,
          },
          collisionHold_ms: 500,
          onPacket: (p, ruleResult) => {
            if (cancelled) return;

            const mergedData = {
              ...p,
              speed: ruleResult.speed,
              is_fire: ruleResult.is_fire,
              ball_scale: ruleResult.ball_scale,
            };

            setPackets((prev) => [mergedData, ...prev].slice(0, 50));
          },
        });

        coordinatorRef.current = coordinator;
        await coordinator.start();
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "failed to start");
        setRunning(false);
      }
    })();

    return () => {
      cancelled = true;
      if (coordinatorRef.current) {
        coordinatorRef.current.stop();
        coordinatorRef.current = null;
      }
    };
  }, [running, micDevice.mic1, micDevice.mic2, setPackets]);

  return {
    running,
    setRunning,
    error,
    canStart,
  };
}
