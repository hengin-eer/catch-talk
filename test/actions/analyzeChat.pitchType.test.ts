import { describe, expect } from "vitest";
import { analyzeChat } from "@/app/actions/analyzeChat";
import { getTestRunner } from "@/test/test-utils";
import type { Message } from "@/types/game";

describe("analyzeChat Pitch Type Analysis", () => {
  const runTest = getTestRunner();

  runTest(
    "should detect 'straight' pitch for clear, direct communication",
    async () => {
      const messages: Message[] = [
        {
          speaker: "player1",
          text: "明日の会議は10時からで間違いないですか？",
        },
        {
          speaker: "player2",
          text: "はい、第一会議室で予定通り行います。資料の準備だけお願いします。",
        },
      ];
      const result = await analyzeChat(messages);
      expect(result.pitchType).toBe("straight");
    },
  );

  runTest(
    "should detect 'slider' pitch for sarcasm or sharp retort",
    async () => {
      const messages: Message[] = [
        {
          speaker: "player1",
          text: "私って、褒められて伸びるタイプなんだよね",
        },
        {
          speaker: "player2",
          text: "へえ、じゃあ天井知らずだね。まだ一度も伸びてるの見たことないけど",
        },
      ];
      const result = await analyzeChat(messages);
      expect(result.pitchType).toBe("slider");
    },
  );

  runTest("should detect 'slider' pitch for sudden topic shift", async () => {
    const messages: Message[] = [
      { speaker: "player1", text: "今日のランチ、駅前のイタリアンにしない？" },
      {
        speaker: "player2",
        text: "そういえば、来週の出張のホテル予約した？ まだなら早めに取らないと埋まるよ",
      },
    ];
    const result = await analyzeChat(messages);
    expect(result.pitchType).toBe("slider");
  });

  runTest(
    "should detect 'curve' pitch for roundabout, long-winded speech",
    async () => {
      const messages: Message[] = [
        {
          speaker: "player1",
          text: "昨日の件なんですけど、えーっと、結論から言うと、その〜、できなかったというか、やろうとはしたんですけど、なんていうか、パソコンの調子が、あのー、急に悪くなってしまって……。",
        },
      ];
      const result = await analyzeChat(messages);
      expect(result.pitchType).toBe("curve");
    },
  );

  runTest(
    "should detect 'knuckle' pitch for nonsensical or random speech",
    async () => {
      const messages: Message[] = [
        {
          speaker: "player1",
          text: "やっぱり、冷蔵庫の裏側には宇宙の真理が隠されていると思うんだ。",
        },
        {
          speaker: "player2",
          text: "なるほど。それで、昨日のカレーは美味しかった？",
        },
        {
          speaker: "player1",
          text: "カレーの辛さが、民主主義の根幹を揺るがすことは明白だよ。だから僕は、右足の小指でピアノを弾く練習を始めたんだ。",
        },
      ];
      const result = await analyzeChat(messages);
      expect(result.pitchType).toBe("knuckle");
    },
  );

  runTest(
    "should detect 'fork' pitch for sudden drop in tone or harsh rejection",
    async () => {
      const messages: Message[] = [
        {
          speaker: "player1",
          text: "うわこの服たっか！！こんなん着て外で歩く気持ちにならんわ！！",
        },
        {
          speaker: "player2",
          text: "ほんまや高すぎやろ！こんなん買う人おらんやろ！！",
        },
        { speaker: "player1", text: "それは買う人に対して失礼やと思うわ" },
        { speaker: "player2", text: "お前マジで地獄に落ちろ" },
      ];
      const result = await analyzeChat(messages);
      expect(result.pitchType).toBe("fork");
    },
  );
});
