"use client";

import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  View,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { Suspense, useCallback, useRef, useState } from "react";
import { Park } from "./Park";
import { PlayerBoy } from "./PlayerBoy";
import { PlayerGirl } from "./PlayerGirl";

// --- 型定義 ---
type ActionName =
  | "catch_before"
  | "catch_LL"
  | "catch_LM"
  | "catch_LR"
  | "catch_ML"
  | "catch_MM"
  | "catch_MR"
  | "catch_UL"
  | "catch_UM"
  | "catch_UR"
  | "miss"
  | "normal"
  | "throw"
  | "throw_light";

type PitcherType = "Boy" | "Girl";
type CourseType = string;

const COURSES = [
  ["UL", "UM", "UR"],
  ["ML", "MM", "MR"],
  ["LL", "LM", "LR"],
];

const framesToMs = (frames: number) => (frames / 60) * 1000;
const PLAYER_DISTANCE = 50;
const CATCH_BEFORE_FRAME = 160;

// ★ポイント1: SceneContent を App の外に移動する
// これにより、Appが再レンダリングされても3Dモデルが再生成（リセット）されなくなります。
const SceneContent = ({
  boyAnim,
  girlAnim,
}: {
  boyAnim: ActionName;
  girlAnim: ActionName;
}) => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
    <Environment preset="city" />
    <Suspense fallback={<p>3Dモデルの読み込み中</p>}>
      <Park position={[0, -1, 0]} scale={3} />
      <PlayerBoy
        position={[-PLAYER_DISTANCE / 2, 0, 0]}
        animationName={boyAnim}
      />
      <PlayerGirl
        position={[PLAYER_DISTANCE / 2, 0, 0]}
        animationName={girlAnim}
        rotation={[0, -Math.PI, 0]}
      />
    </Suspense>
  </>
);

export default function PitchingView() {
  const leftViewRef = useRef<HTMLDivElement>(null!);
  const rightViewRef = useRef<HTMLDivElement>(null!);

  // アニメーション実行中かどうかを管理するRef
  const isAnimating = useRef(false);

  const [currentPitcher, setCurrentPitcher] = useState<PitcherType>("Boy");
  const [selectedCourse, setSelectedCourse] = useState<CourseType>("MM");
  const [boyAnim, setBoyAnim] = useState<ActionName>("normal");
  const [girlAnim, setGirlAnim] = useState<ActionName>("normal");

  const runPitchingAction = useCallback(
    (pitcher: PitcherType, course: CourseType) => {
      if (isAnimating.current) return; // 実行中なら何もしない
      isAnimating.current = true;

      const isBoyPitcher = pitcher === "Boy";
      const setThrowerAnim = isBoyPitcher ? setBoyAnim : setGirlAnim;
      const setCatcherAnim = isBoyPitcher ? setGirlAnim : setBoyAnim;

      // 1. 投球開始
      setThrowerAnim("throw");
      setCatcherAnim("catch_before");

      // 2. キャッチ動作への切り替え
      setTimeout(() => {
        const catchAnimName = `catch_${course}` as ActionName;
        setCatcherAnim(catchAnimName);
        // アニメーション完了後にフラグを戻す（必要に応じて時間を調整）
        setTimeout(() => {
          isAnimating.current = false;
        }, 1000);
      }, framesToMs(CATCH_BEFORE_FRAME));
    },
    [],
  );

  const handleReset = () => {
    isAnimating.current = false;
    setBoyAnim("normal");
    setGirlAnim("normal");
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* 左：女子視点エリア */}
      <div ref={leftViewRef} style={{ flex: 1, height: "100%" }} />

      {/* 右：男子視点エリア */}
      <div
        ref={rightViewRef}
        style={{ flex: 1, height: "100%", borderLeft: "2px solid #333" }}
      />

      {/* UIパネル */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          background: "rgba(255,255,255,0.9)",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Pitcher</span>
          <button
            type="button"
            onClick={() => {
              setCurrentPitcher((prev) => (prev === "Boy" ? "Girl" : "Boy"));
              handleReset();
            }}
            style={{
              padding: "6px 12px",
              background: "#333",
              color: "white",
              border: "none",
              borderRadius: "20px",
              cursor: "pointer",
            }}
          >
            {currentPitcher === "Boy" ? "👦 Boy" : "👧 Girl"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 45px)",
            gap: "6px",
          }}
        >
          {COURSES.flat().map((course) => (
            <button
              type="button"
              key={course}
              onClick={() => {
                setSelectedCourse(course);
                handleReset();
              }}
              style={{
                width: "45px",
                height: "45px",
                background: selectedCourse === course ? "#ff4757" : "#e0e0e0",
                color: selectedCourse === course ? "#fff" : "#333",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {course}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => runPitchingAction(currentPitcher, selectedCourse)}
          style={{
            padding: "12px",
            background: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          投球開始！
        </button>
      </div>

      <Canvas
        shadows
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {/* 左側: 女子視点 */}
        <View track={leftViewRef}>
          <PerspectiveCamera
            makeDefault
            position={[PLAYER_DISTANCE / 2 + 15, 8, -5]}
            fov={50}
          />
          <OrbitControls
            makeDefault
            target={[-PLAYER_DISTANCE / 2, 0, 0]}
            enabled={false}
          />

          <SceneContent boyAnim={boyAnim} girlAnim={girlAnim} />
        </View>

        {/* 右側: 男子視点 */}
        <View track={rightViewRef}>
          <PerspectiveCamera
            makeDefault
            position={[-(PLAYER_DISTANCE / 2 + 15), 8, 5]}
            fov={50}
          />
          <OrbitControls
            makeDefault
            target={[PLAYER_DISTANCE / 2, 0, 0]}
            enabled={false}
          />
          <SceneContent boyAnim={boyAnim} girlAnim={girlAnim} />
        </View>

        <View.Port />
      </Canvas>
    </div>
  );
}
