import type { CourseType } from "@/types/animation";
import type { PitchType } from "@/types/game";

export const PLAYER_DISTANCE = 80;
export const SEPARATE_NUM = 20;

export const BALL_SCALE = 0.4;
export const ZONE_W = 1.5;
export const ZONE_H = 1.5;
export const ZONE_CENTER_Y = 3.5;
export const TRAIL_WIDTH = 10;

export const PITCH_DATA: Record<
  PitchType,
  { name: string; speed: number; color: number }
> = {
  straight: { name: "ストレート", speed: 220, color: 0xffffff },
  curve: { name: "カーブ", speed: 220, color: 0xffa500 },
  slider: { name: "スライダー", speed: 220, color: 0xffff00 },
  fork: { name: "フォーク", speed: 220, color: 0x00ffff },
  knuckle: { name: "スネーク", speed: 220, color: 0x00ff00 },
};

export const COURSE_OFFSETS: Record<string, { x: number; y: number }> = {
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

export const framesToMs = (frames: number) => (frames / 60) * 1000;
export const CATCH_BEFORE_FRAME = 200;
export const THROW_BEFORE_FRAME = 180;

export const COURSES: CourseType[] = [
  "UL",
  "UM",
  "UR",
  "ML",
  "MM",
  "MR",
  "LL",
  "LM",
  "LR",
];
