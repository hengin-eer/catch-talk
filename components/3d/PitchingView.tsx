"use client";

import { Line, OrbitControls, PerspectiveCamera, Sky } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { Suspense, useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BaseBall } from "./Baseball";
import { Park } from "./Park";
// CSS Modules のインポート
import styles from "./PitchingView.module.css";
import { PlayerBoy } from "./Player_boy";
import { PlayerGirl } from "./Player_girl";

// --- 定数 ---
const framesToMs = (frames: number) => (frames / 60) * 1000;
const PLAYER_DISTANCE = 80;
const CATCH_BEFORE_FRAME = 200;
const THROW_BEFORE_FRAME = 180;
const SEPARATE_NUM = 20;

const BALL_SCALE = 0.4;
const ZONE_W = 1.5;
const ZONE_H = 1.5;
const ZONE_CENTER_Y = 3.5;
const TRAIL_WIDTH = 10;

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
type PitchType = "straight" | "curve" | "slider" | "fork" | "knuckle";

//コース分類
const COURSES = [
  ["UL", "UM", "UR"],
  ["ML", "MM", "MR"],
  ["LL", "LM", "LR"],
];

//変化球ごとの定数
const PITCH_DATA: Record<
  PitchType,
  { name: string; speed: number; color: number }
> = {
  straight: { name: "ストレート", speed: 220, color: 0xffffff },
  curve: { name: "カーブ", speed: 220, color: 0xffa500 },
  slider: { name: "スライダー", speed: 220, color: 0xffff00 },
  fork: { name: "フォーク", speed: 220, color: 0x00ffff },
  knuckle: { name: "スネーク", speed: 220, color: 0x00ff00 },
};

//投球コースごとの位置関係
const COURSE_OFFSETS: Record<string, { x: number; y: number }> = {
  UL: { x: 1, y: 1 },
  UM: { x: 0, y: 1 },
  UR: { x: -1, y: 1 },
  ML: { x: 1, y: 0 },
  MM: { x: 0, y: 0 },
  MR: { x: -1, y: 0 },
  LL: { x: 1, y: -1 },
  LM: { x: 0, y: -1 },
  LR: { x: -1, y: -1 },
};

// --- 軌道計算ヘルパー ---
const getDeviation = (type: PitchType, t: number, pitcher: PitcherType) => {
  const dev = new THREE.Vector3(0, 0, 0);
  const side = pitcher === "Boy" ? 1 : -1;
  if (type === "straight") dev.y = 2 * t * (1 - t);
  else if (type === "curve") {
    dev.y = 6 * Math.sin(t * Math.PI);
    dev.x = 15 * Math.sin(t * Math.PI) * side;
    dev.z = 7 * Math.sin(t * Math.PI) * side;
  } else if (type === "slider") {
    const s = t ** 2 * (1 - t);
    dev.x = 10 * s * side;
    dev.y = 4 * s;
    if (t < 0.9) dev.z = 30 * (1 / SEPARATE_NUM) * side;
  } else if (type === "fork") {
    let d = 0;
    if (t > 0.7) d = 50 * (t - 0.5) ** 2 * (1 - t);
    dev.y = 2 * t * (1 - t) - d;
  } else if (type === "knuckle")
    dev.x = (Math.sin(t * Math.PI * 2) + Math.sin(t * Math.PI * 4)) * 4 * side;
  return dev;
};

// --- ボールコンポーネント ---
const MovingBall = ({
  pitcher,
  course,
  pitchType,
  active,
}: {
  pitcher: PitcherType;
  course: string;
  pitchType: PitchType;
  active: boolean;
}) => {
  const ballRef = useRef<THREE.Group>(null!);
  const [trailPoints, setTrailPoints] = useState<[number, number, number][]>([
    [0, 0, 0],
    [0, 0, 0],
  ]);
  const progressRef = useRef(0);
  const ptsRef = useRef<THREE.Vector3[]>([]);

  const flightPath = useMemo(() => {
    const isBoy = pitcher === "Boy";
    const startX = isBoy
      ? -PLAYER_DISTANCE / 2 + 0.5
      : PLAYER_DISTANCE / 2 - 0.5;
    const startZ = isBoy ? 3 : -3;
    const endX = isBoy ? PLAYER_DISTANCE / 2 - 1 : -PLAYER_DISTANCE / 2 + 1;
    const startPos = new THREE.Vector3(startX, 6, startZ);
    const off = COURSE_OFFSETS[course] || COURSE_OFFSETS.MM;
    const endPos = new THREE.Vector3(
      endX,
      ZONE_CENTER_Y + off.y * ZONE_H,
      off.x * ZONE_W * (isBoy ? 1 : -1),
    );

    const pts = [];
    for (let i = 0; i <= SEPARATE_NUM; i++) {
      const t = i / SEPARATE_NUM;
      const p = new THREE.Vector3().lerpVectors(startPos, endPos, t);
      p.add(getDeviation(pitchType, t, pitcher));
      pts.push(p);
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [pitcher, course, pitchType]);

  useFrame((_, delta) => {
    if (!active) {
      if (progressRef.current !== 0) {
        progressRef.current = 0;
        ptsRef.current = [];
        setTrailPoints([
          [0, 0, 0],
          [0, 0, 0],
        ]);
      }
      return;
    }

    const info = PITCH_DATA[pitchType];
    const duration = (PLAYER_DISTANCE / ((info.speed * 1000) / 3600)) * 0.8;

    if (progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + delta / duration, 1);
      const pos = flightPath.getPointAt(progressRef.current);

      if (ballRef.current) {
        ballRef.current.position.copy(pos);
        ballRef.current.rotateY(1);
        ballRef.current.visible = progressRef.current < 0.99;
      }

      ptsRef.current.push(pos.clone());
      const newPoints = ptsRef.current.map(
        (p) => [p.x, p.y, p.z] as [number, number, number],
      );
      if (newPoints.length > 1) {
        setTrailPoints(newPoints);
      }
    } else if (ballRef.current) {
      ballRef.current.visible = false;
    }
  });

  return (
    <group>
      <group ref={ballRef} scale={BALL_SCALE} visible={false}>
        <BaseBall />
      </group>
      <Line
        points={trailPoints}
        color={PITCH_DATA[pitchType].color}
        lineWidth={TRAIL_WIDTH}
        transparent
        opacity={0.6}
      />
    </group>
  );
};

//シーンの再現
const SceneContent = ({
  boyAnim,
  girlAnim,
  ballProps,
}: {
  boyAnim: ActionName;
  girlAnim: ActionName;
  ballProps: any;
}) => (
  <>
    <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.4} />
    <ambientLight intensity={0.8} />
    <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
    <Suspense fallback={null}>
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
      <MovingBall {...ballProps} />
    </Suspense>
  </>
);

//
//  APP
//
export default function App() {
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
          {COURSES.flat().map((c) => (
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
