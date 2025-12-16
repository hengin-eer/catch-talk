import { it } from "vitest";

export function getTestRunner() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      "GEMINI_API_KEY not found in .env.local. Skipping integration tests.",
    );
  }
  return apiKey ? it : it.skip;
}
