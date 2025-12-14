import { createNoiseReducer } from "./noiseReduction";

// DOM要素の取得
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const monitorCheckbox = document.getElementById(
  "monitorCheckbox",
) as HTMLInputElement;
const canvas = document.getElementById("oscilloscope") as HTMLCanvasElement;

const gateSlider = document.getElementById("gateSlider") as HTMLInputElement;
const hpfSlider = document.getElementById("hpfSlider") as HTMLInputElement;
const lpfSlider = document.getElementById("lpfSlider") as HTMLInputElement;

const gateVal = document.getElementById("gateVal") as HTMLSpanElement;
const hpfVal = document.getElementById("hpfVal") as HTMLSpanElement;
const lpfVal = document.getElementById("lpfVal") as HTMLSpanElement;

// オーディオ関連変数
let audioCtx: AudioContext | null = null;
let stream: MediaStream | null = null;
let analyser: AnalyserNode | null = null;
let noiseChain: ReturnType<typeof createNoiseReducer> | null = null;

// キャンバス設定
const canvasCtx = canvas.getContext("2d");
if (canvasCtx) {
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "#00ff00";
}

// 描画ループ
function draw() {
  if (!analyser || !canvasCtx) return;

  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  canvasCtx.fillStyle = "rgb(30, 30, 30)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.beginPath();
  const sliceWidth = (canvas.width * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0; // 0.0 ~ 2.0 (1.0が無音)
    const y = (v * canvas.height) / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();

  requestAnimationFrame(draw);
}

// 開始処理
startBtn.addEventListener("click", async () => {
  try {
    audioCtx = new AudioContext();

    // 1. マイク取得 (テストなので1chでOK)
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const source = audioCtx.createMediaStreamSource(stream);

    // 2. ノイズ除去モジュールの作成
    noiseChain = createNoiseReducer(audioCtx, {
      highPassFreq: Number(hpfSlider.value),
      lowPassFreq: Number(lpfSlider.value),
      gateThreshold: Number(gateSlider.value),
      useCompressor: true,
    });

    // 3. アナライザー（可視化用）
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    // 接続: Mic -> NoiseReducer -> Analyser
    source.connect(noiseChain.input);
    noiseChain.output.connect(analyser);

    // 4. モニター（スピーカー出力）の設定
    // チェックボックスの状態に合わせて接続/切断
    updateMonitorConnection();

    // UI更新
    startBtn.disabled = true;
    stopBtn.disabled = false;

    // 描画開始
    draw();
  } catch (err) {
    console.error(err);
    alert("マイクの取得に失敗しました");
  }
});

// 停止処理
stopBtn.addEventListener("click", () => {
  if (stream) {
    // 【修正】中括弧を追加
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  if (audioCtx) {
    audioCtx.close();
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// モニター出力の切り替え
function updateMonitorConnection() {
  if (!noiseChain || !analyser || !audioCtx) return;

  if (monitorCheckbox.checked) {
    // Output -> Speaker
    analyser.connect(audioCtx.destination);
  } else {
    // 切断
    try {
      analyser.disconnect(audioCtx.destination);
    } catch (e) {
      /* 未接続時のエラー無視 */
    }
  }
}

monitorCheckbox.addEventListener("change", updateMonitorConnection);

// --- スライダーイベント ---

gateSlider.addEventListener("input", (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  gateVal.textContent = val.toFixed(3);
  if (noiseChain) noiseChain.setGateThreshold(val);
});

hpfSlider.addEventListener("input", (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  hpfVal.textContent = String(val);
  if (noiseChain) noiseChain.setHighPassFreq(val);
});

lpfSlider.addEventListener("input", (e) => {
  const val = Number((e.target as HTMLInputElement).value);
  lpfVal.textContent = String(val);
  if (noiseChain) noiseChain.setLowPassFreq(val);
});
