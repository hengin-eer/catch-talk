"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useRef, useState } from "react";
import {
  CATCH_BEFORE_FRAME,
  COURSES,
  framesToMs,
  PITCH_DATA,
  PLAYER_DISTANCE,
  THROW_BEFORE_FRAME,
} from "@/constants/animation";
import type { ActionName, PitcherType } from "@/types/animation";
import type { PitchType } from "@/types/game";
import styles from "./PitchingView.module.css";
import { SceneContent } from "./ScreenContent";

// --- 定数 ---

export default function PitchingView() {
  const isAnimating = useRef(false);

  const [currentPitcher, setCurrentPitcher] = useState<PitcherType>("Boy");
  const [selectedCourse, setSelectedCourse] = useState("MM");
  const [selectedPitch, setSelectedPitch] = useState<PitchType>("straight");
  const [boyAnim, setBoyAnim] = useState<ActionName>("normal");
  const [girlAnim, setGirlAnim] = useState<ActionName>("normal");
  const [ballActive, setBallActive] = useState(false);

  const runPitchingAction = useCallback(
    (pitcher: PitcherType, course: string) => {
      if (isAnimating.current) return;
      isAnimating.current = true;
      setBallActive(false);

      const isBoy = pitcher === "Boy";
      const setThrower = isBoy ? setBoyAnim : setGirlAnim;
      const setCatcher = isBoy ? setGirlAnim : setBoyAnim;

      setThrower("throw");
      setCatcher("catch_before");

      setTimeout(() => {
        setBallActive(true);
      }, framesToMs(THROW_BEFORE_FRAME));

      setTimeout(() => {
        setCatcher(`catch_${course}` as ActionName);
        setTimeout(() => {
          isAnimating.current = false;
        }, 1500);
      }, framesToMs(CATCH_BEFORE_FRAME));
    },
    [],
  );

  //投球モーションののリセット
  const handleReset = () => {
    isAnimating.current = false;
    setBallActive(false);
    setBoyAnim("normal");
    setGirlAnim("normal");
  };

  return (
    <div className={styles.container}>
      {/* 操作パネル */}
      <div className={styles.controlPanel}>
        <div className={styles.panelHeader}>
          <b>Pitcher Control</b>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => {
              setCurrentPitcher((p) => (p === "Boy" ? "Girl" : "Boy"));
              handleReset();
            }}
          >
            {currentPitcher === "Boy" ? "👦 Boy" : "👧 Girl"}
          </button>
        </div>
        <div className={styles.pitchGrid}>
          {(Object.keys(PITCH_DATA) as PitchType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => {
                setSelectedPitch(t);
                handleReset();
              }}
              className={`${styles.pitchButton} ${
                selectedPitch === t ? styles.pitchButtonActive : ""
              }`}
            >
              {PITCH_DATA[t].name}
            </button>
          ))}
        </div>
        <div className={styles.courseGrid}>
          {COURSES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => {
                setSelectedCourse(c);
                handleReset();
              }}
              className={`${styles.courseButton} ${
                selectedCourse === c ? styles.courseButtonActive : ""
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => runPitchingAction(currentPitcher, selectedCourse)}
        >
          PITCH!
        </button>
      </div>

      {/* 3Dの描画 */}
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
