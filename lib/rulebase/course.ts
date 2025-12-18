import type { ChatAnalysisResult } from "@/app/actions/analyzeChat";
import type { CourseGrid } from "@/types/game";

export function mapToCourseGrid(
  analysis: ChatAnalysisResult | null,
): CourseGrid {
  if (!analysis) return "mid-center";

  const { tension, communicationStyle } = analysis;

  // Y軸: Tension (High/Mid/Low)
  // -1.0 ~ -0.33 -> Low
  // -0.33 ~ 0.33 -> Mid
  // 0.33 ~ 1.0 -> High
  let yZone: "low" | "mid" | "high";
  if (tension < -0.33) {
    yZone = "low";
  } else if (tension > 0.33) {
    yZone = "high";
  } else {
    yZone = "mid";
  }

  // X軸: Communication Style (Inside/Center/Outside)
  // -1.0 ~ -0.33 -> Inside (Discussion)
  // -0.33 ~ 0.33 -> Center
  // 0.33 ~ 1.0 -> Outside (Empathy)
  // ※ Inside/Outsideの割り当ては仮定。
  let xZone: "inside" | "center" | "outside";
  if (communicationStyle < -0.33) {
    xZone = "inside";
  } else if (communicationStyle > 0.33) {
    xZone = "outside";
  } else {
    xZone = "center";
  }

  return `${yZone}-${xZone}` as CourseGrid;
}
