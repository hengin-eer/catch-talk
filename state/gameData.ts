import { atom } from "jotai";
import type { Message, PitchData3D, PitchDataChart } from "@/types/game";

export const messagesState = atom<Message[]>([]);
export const pitchData3DState = atom<PitchData3D[]>([]);
export const pitchDataChartState = atom<PitchDataChart[]>([]);
