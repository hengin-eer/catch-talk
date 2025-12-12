import { atom } from "jotai";

export type MicDeviceStateType = {
  mic1: string | undefined;
  mic2: string | undefined;
};

export const micDeviceState = atom<MicDeviceStateType>({
  mic1: undefined,
  mic2: undefined,
});
