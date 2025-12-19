"use client";

import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { analyzeChat } from "@/app/actions/analyzeChat";
import { mapToCourseType } from "@/lib/rulebase/course";
import { calculateBallScale } from "@/lib/rulebase/scale";
import { isSilent } from "@/lib/rulebase/silence";
import { SpeedCalculator } from "@/lib/rulebase/speed";
import { isFire } from "@/lib/rulebase/volume";
import {
  messagesState,
  pitchData3DState,
  pitchDataChartState,
} from "@/state/gameData";
import type {
  Message,
  PitchData3D,
  PitchDataChart,
  RuleBasedResult,
} from "@/types/game";
import { useAudioProcessing } from "./useAudioProcessing";
import { useSilence } from "./useSilence";

const SILENCE_TIMEOUT_MS = 5000;

export function useChat() {
  const [messages, setMessages] = useAtom(messagesState);
  const [, setPitchData3D] = useAtom(pitchData3DState);
  const [, setPitchDataChart] = useAtom(pitchDataChartState);
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(null);

  const { isSilent: isSilenceDetected } = useSilence(
    lastActivityTime,
    SILENCE_TIMEOUT_MS,
  );

  // messagesの最新値を参照するためのRef
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const speedCalcRef = useRef<SpeedCalculator | null>(null);
  if (!speedCalcRef.current) {
    speedCalcRef.current = new SpeedCalculator();
  }

  const { running, setRunning, error, canStart } = useAudioProcessing(
    async (packet) => {
      setLastActivityTime(Date.now());

      const speed = speedCalcRef.current?.calculate(packet) ?? 0;
      const silent = isSilent(packet);
      const fire = isFire(packet);
      const scale = calculateBallScale(packet);

      const ruleResult: RuleBasedResult = {
        packetId: packet.uuid,
        speed,
        is_silent: silent,
        is_fire: fire,
        ball_scale: scale,
      };

      const newMessage: Message = {
        speaker: packet.speaker,
        text: packet.text,
      };

      // Refから最新のメッセージを取得して更新
      const currentMessages = [...messagesRef.current, newMessage];
      setMessages(currentMessages);

      const pitch3D: PitchData3D = {
        uuid: packet.uuid,
        speed: ruleResult.speed,
        type: "straight",
        is_silent: ruleResult.is_silent,
        is_fire: ruleResult.is_fire,
        ball_scale: ruleResult.ball_scale,
        course: "MM",
        text: packet.text,
        speaker: packet.speaker,
      };

      const pitchChart: PitchDataChart = {
        uuid: packet.uuid,
        speed: ruleResult.speed,
        type: "straight",
        is_silent: ruleResult.is_silent,
        is_fire: ruleResult.is_fire,
        ball_scale: ruleResult.ball_scale,
        coordinate: { x: 0, y: 0 },
        text: packet.text,
        speaker: packet.speaker,
      };

      setPitchData3D((prev) => [pitch3D, ...prev].slice(0, 50));
      setPitchDataChart((prev) => [pitchChart, ...prev].slice(0, 50));

      try {
        const analysis = await analyzeChat(currentMessages);
        console.log("Gemini Analysis:", analysis);

        if (analysis) {
          const course = mapToCourseType(analysis);

          setPitchData3D((prev) =>
            prev.map((p) =>
              p.uuid === packet.uuid
                ? { ...p, course, type: analysis.pitchType }
                : p,
            ),
          );

          setPitchDataChart((prev) =>
            prev.map((p) =>
              p.uuid === packet.uuid
                ? {
                    ...p,
                    type: analysis.pitchType,
                    coordinate: {
                      x: analysis.communicationStyle,
                      y: analysis.tension,
                    },
                  }
                : p,
            ),
          );
        }
      } catch (e) {
        console.error("Analyze Chat Error:", e);
      }
    },
  );

  const clearLogs = () => {
    setMessages([]);
    setPitchData3D([]);
    setPitchDataChart([]);
  };

  return {
    running,
    setRunning,
    error,
    canStart,
    clearLogs,
    isSilent: isSilenceDetected,
  };
}
