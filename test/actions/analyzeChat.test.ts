import { describe, expect, it } from "vitest";
import { analyzeChat, type Message } from "../../app/actions/analyzeChat";

describe("analyzeChat Server Action", () => {
  // Skip tests if API key is not set
  const apiKey = process.env.GEMINI_API_KEY;
  const runTest = apiKey ? it : it.skip;

  if (!apiKey) {
    console.warn(
      "GEMINI_API_KEY not found in .env.local. Skipping integration tests.",
    );
  }

  runTest(
    "should analyze high tension and empathy text correctly",
    async () => {
      const messages: Message[] = [
        { speaker: "player1", text: "うわー！まじで！？それはすごいね！！" },
      ];
      const result = await analyzeChat(messages);

      expect(result).toHaveProperty("tension");
      expect(result).toHaveProperty("communicationStyle");

      // Expect high tension
      expect(result.tension).toBeGreaterThan(0.3);
      // Expect empathy
      expect(result.communicationStyle).toBeGreaterThan(0.3);
    },
  );

  runTest("should analyze logical discussion text correctly", async () => {
    const messages: Message[] = [
      { speaker: "player2", text: "前回の議論についてですが..." },
      {
        speaker: "player1",
        text: "なるほど、その点については論理的に矛盾していると思います。",
      },
    ];
    const result = await analyzeChat(messages);

    expect(result).toHaveProperty("tension");
    expect(result).toHaveProperty("communicationStyle");

    // Expect discussion oriented (negative value)
    expect(result.communicationStyle).toBeLessThan(0.0);
  });

  runTest("should handle neutral text", async () => {
    const messages: Message[] = [
      { speaker: "player1", text: "昨日は何食べたの？" },
    ];
    const result = await analyzeChat(messages);

    expect(result).toHaveProperty("tension");
    expect(result).toHaveProperty("communicationStyle");

    // Values should be within range
    expect(result.tension).toBeGreaterThanOrEqual(-1.0);
    expect(result.tension).toBeLessThanOrEqual(1.0);
    expect(result.communicationStyle).toBeGreaterThanOrEqual(-1.0);
    expect(result.communicationStyle).toBeLessThanOrEqual(1.0);
  });
});
