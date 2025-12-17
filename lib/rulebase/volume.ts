import type { MsgPacketType } from "@/types/game";

const FIRE_VOLUME_THRESHOLD = 0.2;

export function isFire(packet: MsgPacketType): boolean {
  return packet.volume >= FIRE_VOLUME_THRESHOLD;
}
