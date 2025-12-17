import { describe, expect, it } from "vitest";
import { calculateBallScale } from "../../lib/rulebase/scale";
import { isSilent } from "../../lib/rulebase/silence";
import { isFire } from "../../lib/rulebase/volume";
import type { MsgPacketType } from "../../types/game";

// テストデータ作成用のヘルパー関数
const createPacket = (text: string, volume: number = 0.5): MsgPacketType => {
  return {
    uuid: "test-uuid",
    speaker: "player1",
    start_at: new Date(),
    duration_ms: 1000,
    volume,
    text,
    is_collision: false,
  };
};

describe("RuleBase Logic Tests", () => {
  describe("isSilent (沈黙判定)", () => {
    it("テキストが空文字の場合は true を返すこと", () => {
      const packet = createPacket("");
      expect(isSilent(packet)).toBe(true);
    });

    it("テキストが空白のみの場合は true を返すこと", () => {
      const packet = createPacket("   ");
      expect(isSilent(packet)).toBe(true);
    });

    it("テキストがある場合は false を返すこと", () => {
      const packet = createPacket("hello");
      expect(isSilent(packet)).toBe(false);
    });
  });

  describe("isFire (火の玉判定)", () => {
    it("音量が0.8以上なら true を返すこと", () => {
      const packet = createPacket("test", 0.8);
      expect(isFire(packet)).toBe(true);
    });

    it("音量が0.8未満なら false を返すこと", () => {
      const packet = createPacket("test", 0.79);
      expect(isFire(packet)).toBe(false);
    });
  });

  describe("calculateBallScale (ボールサイズ計算)", () => {
    it("テキストが空の場合は最小サイズ(1.0)を返すこと", () => {
      const packet = createPacket("");
      expect(calculateBallScale(packet)).toBe(1.0);
    });

    it("文字数に応じてサイズが大きくなること", () => {
      // 50文字 (閾値100文字の半分) -> 1.0 + 0.5 * (2.0 - 1.0) = 1.5
      const text = "a".repeat(50);
      const packet = createPacket(text);
      expect(calculateBallScale(packet)).toBe(1.5);
    });

    it("閾値(100文字)を超えたら最大サイズ(2.0)で止まること", () => {
      const text = "a".repeat(120);
      const packet = createPacket(text);
      expect(calculateBallScale(packet)).toBe(2.0);
    });
  });
});
