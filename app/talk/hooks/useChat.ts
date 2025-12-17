"use client";

import { useAtom } from "jotai";
import { useRef } from "react";
import { calculateBallScale } from "@/lib/rulebase/scale";
import { isSilent } from "@/lib/rulebase/silence";
import { SpeedCalculator } from "@/lib/rulebase/speed";
import { isFire } from "@/lib/rulebase/volume";
import { msgPacketArrayState } from "@/state/msgPacketState";
import { ruleBasedResultArrayState } from "@/state/ruleBasedResult";
import type { RuleBasedResult } from "@/types/game";
import { useAudioProcessing } from "./useAudioProcessing";

export function useChat() {
  const [, setPackets] = useAtom(msgPacketArrayState);
  const [, setRuleResults] = useAtom(ruleBasedResultArrayState);

  // ルールベース計算クラスのインスタンスを保持
  const speedCalcRef = useRef<SpeedCalculator | null>(null);
  if (!speedCalcRef.current) {
    speedCalcRef.current = new SpeedCalculator();
  }

  // 音声処理フックを利用
  // ここで「パケットが来たらどうするか」を一元管理する
  const { running, setRunning, error, canStart } = useAudioProcessing(
    (packet) => {
      // 1. ルールベース処理 (同期的)
      // speedCalcRef.current は初期化済みだが、念のためデフォルト値を用意
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

      // 2. 状態更新 (パケットと計算結果をそれぞれのStateに保存)
      setPackets((prev) => [packet, ...prev].slice(0, 50));
      setRuleResults((prev) => [ruleResult, ...prev].slice(0, 50));

      // 3. Gemini分析 (将来的にはここで非同期呼び出し)
      // analyzeWithGemini(packet).then(aiResult => ...);
      console.log("New Packet:", packet);
      console.log("Rule Result:", ruleResult);
    },
  );

  const clearLogs = () => {
    setPackets([]);
    setRuleResults([]);
  };

  return {
    running,
    setRunning,
    error,
    canStart,
    clearLogs,
  };
}
