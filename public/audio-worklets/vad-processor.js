/* eslint-disable no-undef */
class VadProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const opts = options?.processorOptions || {};
    this.startThreshold =
      typeof opts.startThreshold === "number" ? opts.startThreshold : 0.5;
    this.endThreshold =
      typeof opts.endThreshold === "number" ? opts.endThreshold : 0.3;
    this.hangoverMs =
      typeof opts.hangoverMs === "number" ? opts.hangoverMs : 500;
    this.minSpeechMs =
      typeof opts.minSpeechMs === "number" ? opts.minSpeechMs : 150;
    this.maxSpeechMs =
      typeof opts.maxSpeechMs === "number" ? opts.maxSpeechMs : 10000;

    this.speaking = false;

    this.speechStartSample = 0;
    this.speechSamples = 0;

    this.silenceSamples = 0;
    this.rmsSum = 0;
    this.rmsCount = 0;

    this.overMaxForced = false;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (!msg || typeof msg.type !== "string") return;

      if (msg.type === "force_end") {
        if (this.speaking) {
          this._emitSpeechEnd(true);
        }
      }
    };
  }

  _samplesFromMs(ms) {
    return Math.floor((sampleRate * ms) / 1000);
  }

  _emitSpeechStart() {
    this.speaking = true;
    this.speechStartSample = currentFrame;
    this.speechSamples = 0;
    this.silenceSamples = 0;
    this.rmsSum = 0;
    this.rmsCount = 0;
    this.overMaxForced = false;

    this.port.postMessage({
      type: "speech_start",
      sample: this.speechStartSample,
    });
  }

  _emitSpeechEnd(forced) {
    const speechEndSample = currentFrame;
    const durationSamples = speechEndSample - this.speechStartSample;
    const durationMs = Math.floor((durationSamples * 1000) / sampleRate);
    const avgRms = this.rmsCount > 0 ? this.rmsSum / this.rmsCount : 0;

    this.speaking = false;
    this.silenceSamples = 0;

    this.port.postMessage({
      type: "speech_end",
      sample: speechEndSample,
      durationMs,
      avgRms,
      forced: Boolean(forced),
      overMaxForced: Boolean(this.overMaxForced),
    });
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0) return true;

    const inCh0 = input[0];
    if (!inCh0) return true;

    // pass-through (将来的にここへNRなどを入れて、録音にも反映させる)
    if (output?.[0]) {
      output[0].set(inCh0);
    }

    // RMS
    let sumSq = 0;
    if (inCh0.length > 0) {
      for (let i = 0; i < inCh0.length; i += 1) {
        const v = inCh0[i];
        sumSq += v * v;
      }
    }
    const rms = inCh0.length > 0 ? Math.sqrt(sumSq / inCh0.length) : 0;

    this.port.postMessage({ type: "rms", value: rms, sample: currentFrame });

    const hangoverSamples = this._samplesFromMs(this.hangoverMs);
    const minSpeechSamples = this._samplesFromMs(this.minSpeechMs);
    const maxSpeechSamples = this._samplesFromMs(this.maxSpeechMs);

    if (!this.speaking) {
      if (rms >= this.startThreshold) {
        this._emitSpeechStart();
      }
      return true;
    }

    // speaking
    this.speechSamples += inCh0.length;
    this.rmsSum += rms;
    this.rmsCount += 1;

    if (this.speechSamples >= maxSpeechSamples) {
      this.overMaxForced = true;
      this._emitSpeechEnd(true);
      return true;
    }

    if (rms < this.endThreshold) {
      this.silenceSamples += inCh0.length;
      if (this.silenceSamples >= hangoverSamples) {
        if (this.speechSamples >= minSpeechSamples) {
          this._emitSpeechEnd(false);
        } else {
          // 短すぎる発話は捨てる（speech_endは通知しない）
          this.speaking = false;
          this.silenceSamples = 0;
        }
      }
    } else {
      this.silenceSamples = 0;
    }

    return true;
  }
}

registerProcessor("vad-processor", VadProcessor);
