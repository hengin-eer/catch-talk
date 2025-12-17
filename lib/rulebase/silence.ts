import type { MsgPacketType } from "@/types/game";

// TODO: 沈黙判定のロジックを実装する
// - 5秒間間無音ならサイレントとみなす
// - 無音ならヤジを飛ばすので、それが分かりやすいフラグ名にする
// - 実装方針としては、マイクの入力間隔が5秒以上空いたら沈黙とみなす
const SILENCE_DURATION_THRESHOLD_MS = 5000;

export function isSilent(packet: MsgPacketType): boolean {
  return !packet.text || packet.text.trim().length === 0;
}
