import type { MsgPacketType, RuleBasedResult } from "../../types/game";

const CONFIG = {
  BASE_SPEED: 130, // 基本球速 (km/h)
  MIN_SPEED: 80, // 最低球速
  MAX_SPEED: 165, // 最高球速

  // これが「倍率」にあたります
  // (今の速度 - 平均) が 1.0 増えるごとに、球速を何km/h追加するか
  SPEED_MULTIPLIER: 15,

  INITIAL_AVG_CPS: 6.0,
  LEARNING_RATE: 0.1,
  FIRE_VOLUME_THRESHOLD: 0.8,

  MIN_BALL_SCALE: 1.0, // 最小サイズ (文字数0のとき)
  MAX_BALL_SCALE: 2.0, // 最大サイズ (閾値を超えたとき)
  MAX_SCALE_CHAR_THRESHOLD: 100, // 最大サイズになる文字数の閾値
};

export class SpeedCalculator {
  private averageCps: number;

  constructor() {
    this.averageCps = CONFIG.INITIAL_AVG_CPS;
  }

  public calculate(packet: MsgPacketType): RuleBasedResult {
    if (!packet.text || packet.text.trim().length === 0) {
      return this.createSilentResult(packet.uuid);
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

    // ボールサイズ計算
    const charCount = packet.text.length;

    //1. 割合を計算(現在の文字数 / 閾値の100文字)
    const ratio = Math.min(charCount / CONFIG.MAX_SCALE_CHAR_THRESHOLD, 1.0);

    //2. 大きさを計算(最小値1.0から最大値2.0まで増やす)
    let scale =
      CONFIG.MIN_BALL_SCALE +
      ratio * (CONFIG.MAX_BALL_SCALE - CONFIG.MIN_BALL_SCALE);

    //桁数を整える
    scale = Math.round(scale * 100) / 100;

    return {
      packetId: packet.uuid,
      speed: Math.floor(speed),
      is_silent: false,
      is_fire: isFire,
      ball_scale: Number(scale),
    };
  }

  private createSilentResult(packetId?: string): RuleBasedResult {
    return {
      packetId: packetId ?? "",
      speed: CONFIG.MIN_SPEED,
      is_silent: true,
      is_fire: false,
      ball_scale: CONFIG.MIN_BALL_SCALE, // 定数を用いるよん
    };
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
