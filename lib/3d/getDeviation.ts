import * as THREE from "three";
import type { PitcherType } from "@/types/animation";
import type { PitchType } from "@/types/game";

const SEPARATE_NUM = 20;

// --- 軌道計算ヘルパー ---
export const getDeviation = (
  type: PitchType,
  t: number,
  pitcher: PitcherType,
) => {
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
