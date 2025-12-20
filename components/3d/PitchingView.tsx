"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import {
  CATCH_BEFORE_FRAME,
  framesToMs,
  PLAYER_DISTANCE,
  THROW_BEFORE_FRAME,
} from "@/constants/animation";
import { pitchData3DState } from "@/state/gameData";
import type { ActionName, PitcherType } from "@/types/animation";
import type { PitchType } from "@/types/game";
import styles from "./PitchingView.module.css";
import { SceneContent } from "./ScreenContent";

export default function PitchingView() {
  const [pitchData3D] = useAtom(pitchData3DState);
  const lastPitchIdRef = useRef<string | null>(null);
  const timerRefs = useRef<NodeJS.Timeout[]>([]);

  const [currentPitcher, setCurrentPitcher] = useState<PitcherType>("Boy");
  const [selectedCourse, setSelectedCourse] = useState("MM");
  const [selectedPitch, setSelectedPitch] = useState<PitchType>("straight");
  const [boyAnim, setBoyAnim] = useState<ActionName>("normal");
  const [girlAnim, setGirlAnim] = useState<ActionName>("normal");
  const [ballActive, setBallActive] = useState(false);

  // NOTE: タイマーのクリーンアップ
  const clearAllTimers = () => {
    timerRefs.current.forEach((id) => {
      clearTimeout(id);
    });
    timerRefs.current = [];
  };

  const runPitchingAction = (pitcher: PitcherType, course: string) => {
    // 既存のアニメーションタイマーを全てキャンセル
    clearAllTimers();
    // 強制的に初期状態へリセット（連続実行時のため）
    setBallActive(false);
    setBoyAnim("normal");
    setGirlAnim("normal");
    // 少し待ってから開始しないと、Reactのバッチ処理で状態更新が相殺される可能性があるため
    // requestAnimationFrame等を使うのが理想だが、ここではsetTimeout(0)で次サイクルへ回す
    const startTimer = setTimeout(() => {
      const isBoy = pitcher === "Boy";
      const setThrower = isBoy ? setBoyAnim : setGirlAnim;
      const setCatcher = isBoy ? setGirlAnim : setBoyAnim;

      setThrower("throw");
      setCatcher("catch_before");

      const ballTimer = setTimeout(() => {
        setBallActive(true);
      }, framesToMs(THROW_BEFORE_FRAME));

      const catchTimer = setTimeout(() => {
        setCatcher(`catch_${course}` as ActionName);
        const endTimer = setTimeout(() => {
          setThrower("normal");
          setCatcher("normal");
          setBallActive(false);
        }, 1500);
        timerRefs.current.push(endTimer);
      }, framesToMs(CATCH_BEFORE_FRAME));

      timerRefs.current.push(ballTimer, catchTimer);
    }, 0);

    timerRefs.current.push(startTimer);
  };

  // 投球データの監視とアニメーション実行
  // biome-ignore lint/correctness/useExhaustiveDependencies: React Compiler handles memoization
  useEffect(() => {
    const latestPitch = pitchData3D[0];
    if (!latestPitch) return;
    if (latestPitch.type === "null") return;
    // 新しい投球データが来た場合のみ実行
    if (latestPitch.uuid !== lastPitchIdRef.current) {
      lastPitchIdRef.current = latestPitch.uuid;
      // パラメータのマッピング
      const nextPitcher: PitcherType =
        latestPitch.speaker === "player1" ? "Girl" : "Boy";
      const nextCourse = latestPitch.course;
      const nextPitchType = latestPitch.type;
      // UIステートを更新
      setCurrentPitcher(nextPitcher);
      setSelectedCourse(nextCourse);
      setSelectedPitch(nextPitchType);
      // アニメーション実行
      runPitchingAction(nextPitcher, nextCourse);
    }
  }, [pitchData3D]);

  // コンポーネントのアンマウント時にタイマーをクリア
  // biome-ignore lint/correctness/useExhaustiveDependencies: React Compiler handles memoization
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  return (
    <div className={styles.container}>
      <Canvas shadows className={styles.canvas}>
        <PerspectiveCamera
          makeDefault
          position={[PLAYER_DISTANCE / 2 + 10, 8, -5]}
          fov={50}
        />
        <OrbitControls makeDefault target={[0, 2, 0]} enabled={false} />
        <SceneContent
          boyAnim={boyAnim}
          girlAnim={girlAnim}
          ballProps={{
            pitcher: currentPitcher,
            course: selectedCourse,
            pitchType: selectedPitch,
            active: ballActive,
          }}
        />
      </Canvas>
    </div>
  );
}
