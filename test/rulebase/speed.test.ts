import { describe, it, expect, beforeEach } from 'vitest';
import { SpeedCalculator } from './speed';
import { MsgPacketType } from '../../types/game';

// テストデータ作成用のヘルパー関数
const createPacket = (
  text: string,
  duration_ms: number,
  volume: number = 0.5
): MsgPacketType => {
  return {
    uuid: 'test-uuid',
    speaker: 'player1',
    start_at: new Date(),
    duration_ms,
    volume,
    text,
    is_collision: false,
  };
};

describe('SpeedCalculator', () => {
  let calculator: SpeedCalculator;

  // 各テスト実行前にインスタンスを新しく作り直す（状態のリセット）
  beforeEach(() => {
    calculator = new SpeedCalculator();
  });

  describe('初期状態と沈黙の処理', () => {
    it('初期の平均話速(CPS)は設定値(6.0)であること', () => {
      expect(calculator.getCurrentAverageCps()).toBe(6.0);
    });

    it('テキストが空の場合は沈黙(is_silent)判定になり、最低球速になること', () => {
      const packet = createPacket('', 1000);
      const result = calculator.calculate(packet);

      expect(result.is_silent).toBe(true);
      expect(result.speed).toBe(80); // CONFIG.MIN_SPEED
      expect(result.is_fire).toBe(false);
    });
  });

  describe('球速の計算ロジック', () => {
    it('平均と同じ速度で話すと、基準球速(130km/h)になること', () => {
      // 平均6.0文字/秒なので、1秒で6文字話させる
      const packet = createPacket('123456', 1000);
      const result = calculator.calculate(packet);

      expect(result.speed).toBe(130); // CONFIG.BASE_SPEED
    });

    it('平均より早く話すと、球速が上がること', () => {
      // 1秒で12文字 (CPS=12.0)。平均(6.0)との差は+6.0
      // 130 + (6.0 * 15) = 220 -> 上限165で止まるはず
      const packet = createPacket('123456789012', 1000);
      const result = calculator.calculate(packet);

      expect(result.speed).toBe(165); // CONFIG.MAX_SPEED check
    });

    it('平均より遅く話すと、球速が下がること', () => {
      // 1秒で3文字 (CPS=3.0)。平均(6.0)との差は-3.0
      // 130 + (-3.0 * 15) = 130 - 45 = 85
      const packet = createPacket('123', 1000);
      const result = calculator.calculate(packet);

      expect(result.speed).toBe(85);
    });
  });

  describe('学習（平均値の更新）', () => {
    it('計算を行うたびに平均話速が更新されること', () => {
      const initialAvg = calculator.getCurrentAverageCps(); // 6.0

      // かなりの早口を入力 (CPS=16.0)
      const packet = createPacket('1234567890123456', 1000);
      calculator.calculate(packet);

      const newAvg = calculator.getCurrentAverageCps();

      // 計算式: (6.0 * 0.9) + (16.0 * 0.1) = 5.4 + 1.6 = 7.0
      expect(newAvg).toBeCloseTo(7.0);
      expect(newAvg).toBeGreaterThan(initialAvg); // 平均が上がっているはず
    });
  });

  describe('演出判定 (Fire / Scale)', () => {
    it('音量が閾値(0.8)以上なら is_fire が true になること', () => {
      const packet = createPacket('test', 1000, 0.8); // volume 0.8
      const result = calculator.calculate(packet);
      expect(result.is_fire).toBe(true);
    });

    it('音量が閾値未満なら is_fire が false になること', () => {
      const packet = createPacket('test', 1000, 0.79); // volume 0.79
      const result = calculator.calculate(packet);
      expect(result.is_fire).toBe(false);
    });

    it('文字数が多いほど ball_scale が大きくなること', () => {
      // 基準20文字。45文字入力してみる。
      // 1.0 + (45 - 20) * 0.02 = 1.0 + 0.5 = 1.5倍
      const longText = 'a'.repeat(45);
      const packet = createPacket(longText, 1000);
      const result = calculator.calculate(packet);

      expect(result.ball_scale).toBe(1.5);
    });
  });
});
