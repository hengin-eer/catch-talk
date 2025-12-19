import type { CourseType } from "@/types/animation";
import type { GptBasedResult } from "@/types/game";

export function mapToCourseType(analysis: GptBasedResult | null): CourseType {
  if (!analysis) return "MM";

  const { tension, communicationStyle } = analysis;

  // Y軸: Tension (High/Mid/Low) -> U/M/L
  // -1.0 ~ -0.33 -> Low (L)
  // -0.33 ~ 0.33 -> Mid (M)
  // 0.33 ~ 1.0 -> High (U)
  let yChar: "U" | "M" | "L";
  if (tension < -0.33) {
    yChar = "L";
  } else if (tension > 0.33) {
    yChar = "U";
  } else {
    yChar = "M";
  }

  // X軸: Communication Style (Inside/Center/Outside) -> L/M/R
  // -1.0 ~ -0.33 -> Inside (Discussion) -> L
  // -0.33 ~ 0.33 -> Center -> M
  // 0.33 ~ 1.0 -> Outside (Empathy) -> R
  let xChar: "L" | "M" | "R";
  if (communicationStyle < -0.33) {
    xChar = "L";
  } else if (communicationStyle > 0.33) {
    xChar = "R";
  } else {
    xChar = "M";
  }

  return `${yChar}${xChar}` as CourseType;
}
