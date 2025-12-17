import { MsgPacketType, RuleBasedResult } from '../../types/game';

const CONFIG = {
  BASE_SPEED: 130,        // 基本球速 (km/h)
  MIN_SPEED: 80,          // 最低球速
  MAX_SPEED: 165,         // 最高球速

  // これが「倍率」にあたります
  // (今の速度 - 平均) が 1.0 増えるごとに、球速を何km/h追加するか
  SPEED_MULTIPLIER: 15,

  INITIAL_AVG_CPS: 6.0,
  LEARNING_RATE: 0.1,
  FIRE_VOLUME_THRESHOLD: 0.8,
  SCALE_BASE_LENGTH: 20,
  MAX_SCALE: 3.0,
};

export class SpeedCalculator {
  private averageCps: number;

  constructor() {
    this.averageCps = CONFIG.INITIAL_AVG_CPS;
  }

  public calculate(packet: MsgPacketType): RuleBasedResult {
    if (!packet.text || packet.text.trim().length === 0) {
      return this.createSilentResult();
    }

    // 1. 今の速度を計算
    const durationSec = Math.max(packet.duration_ms, 1) / 1000;
    const currentCps = packet.text.length / durationSec;

    // -------------------------------------------------------
    // ご指定の計算ロジック
    // -------------------------------------------------------

    // [差分] : 会話の速度 - 平均的な会話速度
    const diff = currentCps - this.averageCps;

    // [付加速度] : 差分 * 倍率
    // ※ 遅く喋った場合は diff がマイナスになるので、付加速度もマイナス（減速）になります
    const additionalSpeed = diff * CONFIG.SPEED_MULTIPLIER;

    // [球速] : 基本球速 + 付加速度
    let speed = CONFIG.BASE_SPEED + additionalSpeed;

    // -------------------------------------------------------

    // 範囲制限 (最低〜最高球速の間に収める)
    speed = Math.min(Math.max(speed, CONFIG.MIN_SPEED), CONFIG.MAX_SPEED);

    // 平均値の更新
    this.updateAverage(currentCps);

    // 演出判定
    const isFire = packet.volume >= CONFIG.FIRE_VOLUME_THRESHOLD;

    let scale = 1.0 + (packet.text.length - CONFIG.SCALE_BASE_LENGTH) * 0.02;
    scale = Math.min(Math.max(scale, 0.5), CONFIG.MAX_SCALE);

    return {
      speed: Math.floor(speed),
      is_silent: false,
      is_fire: isFire,
      ball_scale: Number(scale.toFixed(2)),
    };
  }

  private createSilentResult(): RuleBasedResult {
    return {
      speed: CONFIG.MIN_SPEED,
      is_silent: true,
      is_fire: false,
      ball_scale: 1.0,
    };
  }

  private updateAverage(currentVal: number) {
    this.averageCps = (this.averageCps * (1 - CONFIG.LEARNING_RATE)) + (currentVal * CONFIG.LEARNING_RATE);
  }

  public getCurrentAverageCps(): number {
    return this.averageCps;
  }
}
