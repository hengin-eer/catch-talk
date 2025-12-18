"use client";

import { useAtom } from "jotai";
import { pitchData3DState, pitchDataChartState } from "@/state/gameData";
import type { PitchType } from "@/types/game";
import styles from "./ChatAnalysisDebug.module.css";

const PITCH_SYMBOLS: Record<PitchType, string> = {
  straight: "o",
  curve: "c",
  slider: ">",
  fork: "v",
  knuckle: "?",
};

export function ChatAnalysisDebug({ isSilent }: { isSilent: boolean }) {
  const [pitchData3D] = useAtom(pitchData3DState);
  const [pitchDataChart] = useAtom(pitchDataChartState);

  // 最新の投球データ
  const latestPitch = pitchData3D[0];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Chat Analysis Debug</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isSilent && (
            <span style={{ color: "red", fontWeight: "bold" }}>SILENT!</span>
          )}
          <span>{pitchDataChart.length} items</span>
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>最新の投球 (3D)</h4>
        {latestPitch ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>球速:</span>
              <span>{latestPitch.speed.toFixed(1)} km/h</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>球種:</span>
              <span>{latestPitch.type}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>コース:</span>
              <span className="text-yellow-400">{latestPitch.course}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>火の玉:</span>
              <span>{latestPitch.is_fire ? "あり" : "なし"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>沈黙:</span>
              <span>{latestPitch.is_silent ? "あり" : "なし"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>大きさ:</span>
              <span>{latestPitch.ball_scale.toFixed(2)}x</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">データなし</div>
        )}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>配球チャート</h4>
        <div className={styles.chartContainer}>
          {/* Grid Lines */}
          <div className={styles.gridLineH} style={{ top: "33.3%" }} />
          <div className={styles.gridLineH} style={{ top: "66.6%" }} />
          <div className={styles.gridLineV} style={{ left: "33.3%" }} />
          <div className={styles.gridLineV} style={{ left: "66.6%" }} />

          {/* Center Cross */}
          <div className={styles.centerCrossH} />
          <div className={styles.centerCrossV} />

          {/* Plots */}
          {pitchDataChart.map((p) => {
            const top = ((1 - p.coordinate.y) / 2) * 100;
            const left = ((p.coordinate.x + 1) / 2) * 100;

            return (
              <div
                key={p.uuid}
                className={`${styles.plotPoint} ${
                  p.is_fire ? styles.plotFire : styles.plotNormal
                }`}
                style={{ top: `${top}%`, left: `${left}%` }}
                title={`Speed: ${p.speed}, Type: ${p.type}`}
              >
                {PITCH_SYMBOLS[p.type] || "?"}
              </div>
            );
          })}
        </div>
        <div className="mt-1 text-[10px] text-gray-500 text-center">
          X: Comm Style / Y: Tension
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>投球履歴 (History)</h4>
        <div className={styles.listContainer}>
          {pitchDataChart.map((p) => {
            return (
              <div key={p.uuid} className={styles.listItem}>
                <div className={styles.itemHeader}>
                  <span>{p.speaker ? p.speaker : "System"}</span>
                  <span>{p.is_silent ? "SILENCE" : ""}</span>
                </div>
                <div className={styles.itemText}>
                  {p.text ? p.text : "(No text)"}
                </div>
                <div className={styles.itemDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      緊張感 (Tension):
                    </span>
                    <span>{p.coordinate.y.toFixed(2)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      スタイル (Style):
                    </span>
                    <span>{p.coordinate.x.toFixed(2)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>球速 (Speed):</span>
                    <span>{p.speed.toFixed(0)} km/h</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>火の玉 (Fire):</span>
                    <span>{p.is_fire ? "あり" : "なし"}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>球種 (Type):</span>
                    <span>{p.type}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>大きさ (Scale):</span>
                    <span>{p.ball_scale.toFixed(2)}x</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
