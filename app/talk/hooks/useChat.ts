"use client";

import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { v7 as uuidv7 } from "uuid";
import { analyzeChat } from "@/app/actions/analyzeChat";
import { mapToCourseGrid } from "@/lib/rulebase/course";
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

const SILENCE_TIMEOUT_MS = 5000;

export function useChat() {
  const [messages, setMessages] = useAtom(messagesState);
  const [, setPitchData3D] = useAtom(pitchData3DState);
  const [, setPitchDataChart] = useAtom(pitchDataChartState);

  // messagesの最新値を参照するためのRef
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const speedCalcRef = useRef<SpeedCalculator | null>(null);
  if (!speedCalcRef.current) {
    speedCalcRef.current = new SpeedCalculator();
  }

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSilence = () => {
    const packetId = uuidv7();
    const ruleResult: RuleBasedResult = {
      packetId,
      speed: 0,
      is_silent: true,
      is_fire: false,
      ball_scale: 1.0,
    };

    const pitch3D: PitchData3D = {
      uuid: packetId,
      speed: ruleResult.speed,
      type: "straight",
      is_silent: true,
      is_fire: false,
      ball_scale: 1.0,
      course: "mid-center",
      text: "(Silence...)",
    };

    const pitchChart: PitchDataChart = {
      uuid: packetId,
      speed: ruleResult.speed,
      type: "straight",
      is_silent: true,
      is_fire: false,
      ball_scale: 1.0,
      coordinate: { x: 0, y: 0 },
      text: "(Silence...)",
    };

    setPitchData3D((prev) => [pitch3D, ...prev].slice(0, 50));
    setPitchDataChart((prev) => [pitchChart, ...prev].slice(0, 50));
    console.log("Silence detected");
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(handleSilence, SILENCE_TIMEOUT_MS);
  };

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const { running, setRunning, error, canStart } = useAudioProcessing(
    async (packet) => {
      resetSilenceTimer();

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
        course: "mid-center",
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
          const course = mapToCourseGrid(analysis);

          setPitchData3D((prev) =>
            prev.map((p) => (p.uuid === packet.uuid ? { ...p, course } : p)),
          );

          setPitchDataChart((prev) =>
            prev.map((p) =>
              p.uuid === packet.uuid
                ? {
                    ...p,
                    coordinates: {
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
  };
}
