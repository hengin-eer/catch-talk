"use client";

import { useAtom } from "jotai";
import { Caveat, Fredoka } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { MicDeviceStateType } from "@/state/micDeviceState";
import { micDeviceState } from "@/state/micDeviceState";
import styles from "./page.module.css";

const playful = Fredoka({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-playful",
});

const handwriting = Caveat({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-handwriting",
});

type LegacyAudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

// マイク入力を受け取るためにいじいじするやつ
async function createLevelMonitor(
  deviceId: string,
  onLevel: (value: number) => void,
): Promise<() => void> {
  if (!navigator.mediaDevices?.getUserMedia) return () => {};

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
    },
  });

  const AudioCtx =
    window.AudioContext ||
    (window as LegacyAudioContextWindow).webkitAudioContext;
  if (typeof AudioCtx !== "function") {
    throw new Error("Web Audio API is not supported in this environment.");
  }
  const audioCtx = new AudioCtx();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const buffer = new Uint8Array(analyser.fftSize);
  let rafId: number | null = null;

  const pump = () => {
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const normalized = (buffer[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / buffer.length);
    onLevel(Math.min(1, rms * 2));
    rafId = requestAnimationFrame(pump);
  };

  pump();

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    source.disconnect();
    analyser.disconnect();
    for (const track of stream.getTracks()) {
      track.stop();
    }
    audioCtx.close().catch((err) => {
      console.error("Error closing audio context:", err);
    });
    onLevel(0);
  };
}

export default function Home() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDevice, setMicDevice] = useAtom<MicDeviceStateType>(micDeviceState);
  const [level1, setLevel1] = useState(0);
  const [level2, setLevel2] = useState(0);
  const router = useRouter();

  // マイクデバイスを検知する処理
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    let stop = false;
    let inflight: Promise<void> | null = null;

    const refreshDevices = async () => {
      if (inflight) return inflight;

      inflight = (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((t) => {
            t.stop();
          });

          const devs = (await navigator.mediaDevices.enumerateDevices()).filter(
            (d) => d.kind === "audioinput",
          );
          if (stop) return;
          setDevices(devs);
          setMicDevice((prev) => {
            const mic1Exists =
              prev.mic1 && devs.some((d) => d.deviceId === prev.mic1);
            const mic2Exists =
              prev.mic2 && devs.some((d) => d.deviceId === prev.mic2);

            return {
              mic1: mic1Exists ? prev.mic1 : undefined,
              mic2: mic2Exists ? prev.mic2 : undefined,
            };
          });
        } catch (err) {
          console.error("mic enumerate failed", err);
        }
      })().finally(() => {
        inflight = null;
      });

      return inflight;
    };

    refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => {
      stop = true;
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        refreshDevices,
      );
    };
  }, [setMicDevice]);

  // マイクレベルを監視する処理
  useEffect(() => {
    if (!micDevice.mic1) {
      setLevel1(0);
      return;
    }

    let stop: (() => void) | undefined;
    let cancelled = false;

    createLevelMonitor(micDevice.mic1, setLevel1)
      .then((cleanup) => {
        if (cancelled) cleanup();
        else stop = cleanup;
      })
      .catch((err) => {
        console.error("mic1 meter failed", err);
        setLevel1(0);
      });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [micDevice.mic1]);

  useEffect(() => {
    if (!micDevice.mic2) {
      setLevel2(0);
      return;
    }

    let stop: (() => void) | undefined;
    let cancelled = false;

    createLevelMonitor(micDevice.mic2, setLevel2)
      .then((cleanup) => {
        if (cancelled) cleanup();
        else stop = cleanup;
      })
      .catch((err) => {
        console.error("mic2 meter failed", err);
        setLevel2(0);
      });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [micDevice.mic2]);

  // TODO: これは取りあえずのAlertなので、後でちゃんとしたUIにする
  const handleStart = () => {
    if (!micDevice.mic1 || !micDevice.mic2) {
      alert("マイクを２本選んでからスタートしてね");
      return;
    }

    if (micDevice.mic1 === micDevice.mic2) {
      alert("同じマイクは選べないよ");
      return;
    }

    router.push("/talk");
  };

  return (
    <div
      className={`${styles.page} ${playful.variable} ${handwriting.variable}`}
    >
      <main className={styles.main}>
        <section className={styles.stage}>
          <div className={styles.signboard}>
            <span className={styles.rope} aria-hidden="true" />
            <span className={styles.rope} aria-hidden="true" />
            <h1>Catch Talk</h1>
            <p>マイクを２本接続してスタートボタンを押してね</p>
          </div>
        </section>

        <section className={styles.controlDeck}>
          <div className={styles.playerRow}>
            {["Player 1 Mic", "Player 2 Mic"].map((label, index) => (
              <div key={label} className={styles.playerCard}>
                <label htmlFor={`player-${index}`} className={styles.cardLabel}>
                  {label}
                </label>
                <div className={styles.selectShell}>
                  <select
                    id={`player-${index}`}
                    value={
                      index === 0
                        ? (micDevice.mic1 ?? "")
                        : (micDevice.mic2 ?? "")
                    }
                    onChange={(event) => {
                      const value = event.target.value || undefined;
                      if (index === 0) {
                        setMicDevice((prev) => ({ ...prev, mic1: value }));
                      } else {
                        setMicDevice((prev) => ({ ...prev, mic2: value }));
                      }
                    }}
                    disabled={!devices.length}
                    aria-label={label}
                  >
                    <option value="">デバイスを選択してください</option>
                    {devices.map((device, deviceIndex) => (
                      <option
                        key={device.deviceId || deviceIndex}
                        value={device.deviceId}
                      >
                        {device.label || `Mic ${deviceIndex + 1}`}
                      </option>
                    ))}
                  </select>
                  <span className={styles.caret} aria-hidden="true">
                    ▾
                  </span>
                </div>
                <div
                  className={styles.levelMeter}
                  role="progressbar"
                  aria-label={`${label} current input level`}
                  aria-valuenow={index === 0 ? level1 : level2}
                  aria-valuemin={0}
                  aria-valuemax={1}
                >
                  <span
                    style={{
                      width: `${Math.round(
                        (index === 0 ? level1 : level2) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.startButton}
            onClick={handleStart}
          >
            Start
          </button>
        </section>
      </main>
    </div>
  );
}
