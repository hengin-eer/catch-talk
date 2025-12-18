import type { MsgPacketType } from "@/types/game";

const CONFIG = {
  MIN_BALL_SCALE: 1.0,
  MAX_BALL_SCALE: 2.0,
  MAX_SCALE_CHAR_THRESHOLD: 100,
};

export function calculateBallScale(packet: MsgPacketType): number {
  if (!packet.text || packet.text.trim().length === 0) {
    return CONFIG.MIN_BALL_SCALE;
  }

  const charCount = packet.text.length;
  const ratio = Math.min(charCount / CONFIG.MAX_SCALE_CHAR_THRESHOLD, 1.0);
  const scale =
    CONFIG.MIN_BALL_SCALE +
    ratio * (CONFIG.MAX_BALL_SCALE - CONFIG.MIN_BALL_SCALE);

  return Math.round(scale * 100) / 100;
}
