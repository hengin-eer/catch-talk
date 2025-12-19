import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getDeviation } from "@/lib/3d/getDeviation";
import type { PitcherType } from "@/types/animation";
import type { PitchType } from "@/types/game";
import { BaseBall } from "./Baseball";

const PLAYER_DISTANCE = 80;
const SEPARATE_NUM = 20;

const BALL_SCALE = 0.4;
const ZONE_W = 1.5;
const ZONE_H = 1.5;
const ZONE_CENTER_Y = 3.5;
const TRAIL_WIDTH = 10;

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

export const MovingBall = ({
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
