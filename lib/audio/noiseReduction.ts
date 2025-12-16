/**
 * ノイズ除去モジュール（ヒステリシス・スムージング対応版）
 * * WaveShaper(即時切り替え)を廃止し、ScriptProcessorによる
 * ステートフルなノイズゲート処理を実装しました。
 */

export type NoiseReductionConfig = {
  readonly highPassFreq?: number;
  readonly lowPassFreq?: number;
  readonly gateThreshold?: number; // ゲートが開く閾値
  readonly useCompressor?: boolean;
};

export type NoiseReductionChain = {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly setHighPassFreq: (freq: number) => void;
  readonly setLowPassFreq: (freq: number) => void;
  readonly setGateThreshold: (threshold: number) => void;
};

const createFilter = (
  ctx: AudioContext,
  type: BiquadFilterType,
  freq: number,
  q: number = 0.7,
): BiquadFilterNode => {
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  return filter;
};

const createCompressor = (ctx: AudioContext): DynamicsCompressorNode => {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  return compressor;
};

/**
 * 高機能ノイズゲート (ScriptProcessorNodeを使用)
 * - ヒステリシス: 開く閾値と閉じる閾値に差をつけ、パタパタするのを防ぐ
 * - アタック/リリース: 音量を滑らかに変化させ、プチノイズを防ぐ
 */
const createAdvancedGate = (
  ctx: AudioContext,
  initialThreshold: number,
): {
  node: ScriptProcessorNode;
  setThreshold: (val: number) => void;
} => {
  // 4096サンプル単位で処理 (遅延は約0.1秒弱発生するが、負荷と精度のバランスが良い)
  const bufferSize = 4096;
  const processor = ctx.createScriptProcessor(bufferSize, 1, 1);

  // 内部状態変数
  let threshold = initialThreshold;
  let currentGain = 0.0; // 現在の音量倍率 (0.0 〜 1.0)
  let isGateOpen = false;
  let holdCounter = 0; // ゲートを少しの間開いたままにするカウンタ

  // 定数設定
  const SAMPLE_RATE = ctx.sampleRate;
  const ATTACK_SPEED = 0.01; // フェードインの速さ
  const RELEASE_SPEED = 0.0005; // フェードアウトの速さ (ゆっくり消す)
  const HOLD_TIME_SEC = 0.1; // 閾値を下回っても0.2秒は維持する (語尾切れ防止)
  const HOLD_SAMPLES = SAMPLE_RATE * HOLD_TIME_SEC;

  // ヒステリシス係数 (0.5 = 閾値の半分まで下がらないと閉じない)
  const HYSTERESIS_RATIO = 0.5;

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const output = e.outputBuffer.getChannelData(0);
    const len = input.length;

    // 閉じる閾値 (開く閾値より低く設定することでヒステリシスを作る)
    const closeThreshold = threshold * HYSTERESIS_RATIO;

    for (let i = 0; i < len; i++) {
      const inputLevel = Math.abs(input[i]);

      // --- ステートマシン ---
      if (inputLevel > threshold) {
        // 開く閾値を超えた -> 即オープン
        isGateOpen = true;
        holdCounter = HOLD_SAMPLES; // ホールド時間をチャージ
      } else if (isGateOpen) {
        // まだ開いているが、閾値は下回った
        if (inputLevel < closeThreshold) {
          // 閉じる閾値も下回った -> ホールド時間を消費
          holdCounter--;
          if (holdCounter <= 0) {
            isGateOpen = false; // 時間切れでクローズ
          }
        } else {
          // ヒステリシス領域 (close < input < open)
          // 何もしない（現在の状態を維持 = 開いたまま）
        }
      }

      // --- ゲインのスムージング (アタック/リリース) ---
      const targetGain = isGateOpen ? 1.0 : 0.0;

      if (currentGain < targetGain) {
        // アタック (音を出す)
        currentGain += ATTACK_SPEED;
        if (currentGain > 1.0) currentGain = 1.0;
      } else if (currentGain > targetGain) {
        // リリース (音を消す)
        currentGain -= RELEASE_SPEED;
        if (currentGain < 0.0) currentGain = 0.0;
      }

      // 出力に適用
      output[i] = input[i] * currentGain;
    }
  };

  const setThreshold = (val: number) => {
    threshold = val;
  };

  return { node: processor, setThreshold };
};

export const createNoiseReducer = (
  ctx: AudioContext,
  config: NoiseReductionConfig = {},
): NoiseReductionChain => {
  const highPassFreq = config.highPassFreq ?? 150;
  const lowPassFreq = config.lowPassFreq ?? 8000;
  const gateThreshold = config.gateThreshold ?? 0.02;
  const useCompressor = config.useCompressor ?? true;

  const inputNode = ctx.createGain();
  const outputNode = ctx.createGain();

  const hpf = createFilter(ctx, "highpass", highPassFreq);
  const lpf = createFilter(ctx, "lowpass", lowPassFreq);

  // ★新しいゲートを作成
  const { node: gateNode, setThreshold: setGateThresholdInternal } =
    createAdvancedGate(ctx, gateThreshold);

  // 接続フロー: Input -> HPF -> LPF -> Gate -> [Compressor] -> Output

  inputNode.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(gateNode); // ScriptProcessorへ

  let lastNode: AudioNode = gateNode;

  if (useCompressor) {
    const comp = createCompressor(ctx);
    lastNode.connect(comp);
    lastNode = comp;
  }

  lastNode.connect(outputNode);

  // ScriptProcessorは入力だけでなく出力先(destination)への接続ルートがないと動かないことがあるため、
  // outputNodeが最終的にdestinationへ繋がることを前提とします。
  // (Web Audio APIの仕様上の注意点)

  // 制御関数
  const setHighPassFreq = (freq: number) => {
    hpf.frequency.setValueAtTime(freq, ctx.currentTime);
  };

  const setLowPassFreq = (freq: number) => {
    lpf.frequency.setValueAtTime(freq, ctx.currentTime);
  };

  const setGateThreshold = (threshold: number) => {
    setGateThresholdInternal(threshold);
  };

  return {
    input: inputNode,
    output: outputNode,
    setHighPassFreq,
    setLowPassFreq,
    setGateThreshold,
  };
};
