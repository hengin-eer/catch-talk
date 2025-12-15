import { atom } from "jotai";
import type { MsgPacketType } from "@/types/game";

export const msgPacketArrayState = atom<MsgPacketType[]>([]);
