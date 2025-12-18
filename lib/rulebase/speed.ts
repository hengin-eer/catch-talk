import type { MsgPacketType } from "@/types/game";

const CONFIG = {
  BASE_SPEED: 130, // 基本球速 (km/h)
  MIN_SPEED: 80, // 最低球速
  MAX_SPEED: 165, // 最高球速
  SPEED_MULTIPLIER: 15,
  INITIAL_AVG_CPS: 6.0,
  LEARNING_RATE: 0.1,
};

export class SpeedCalculator {
  private averageCps: number;

  constructor() {
    this.averageCps = CONFIG.INITIAL_AVG_CPS;
  }

  public calculate(packet: MsgPacketType): number {
    if (!packet.text || packet.text.trim().length === 0) {
      return CONFIG.MIN_SPEED;
    }

    const durationSec = Math.max(packet.duration_ms, 1) / 1000;
    const currentCps = packet.text.length / durationSec;

    const diff = currentCps - this.averageCps;
    const additionalSpeed = diff * CONFIG.SPEED_MULTIPLIER;
    let speed = CONFIG.BASE_SPEED + additionalSpeed;

    speed = Math.min(Math.max(speed, CONFIG.MIN_SPEED), CONFIG.MAX_SPEED);

    this.updateAverage(currentCps);

    return Math.floor(speed);
  }

  private updateAverage(currentVal: number) {
    this.averageCps =
      this.averageCps * (1 - CONFIG.LEARNING_RATE) +
      currentVal * CONFIG.LEARNING_RATE;
  }

  public getCurrentAverageCps(): number {
    return this.averageCps;
  }
}
