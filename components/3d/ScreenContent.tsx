import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import type { ActionName } from "@/types/animation";
import { Park } from "./Park";
import { PlayerBoy } from "./PlayerBoy";
import { PlayerGirl } from "./PlayerGirl";

const PLAYER_DISTANCE = 50;

export const SceneContent = ({
  boyAnim,
  girlAnim,
}: {
  boyAnim: ActionName;
  girlAnim: ActionName;
}) => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
    <Environment preset="city" />
    <Suspense fallback={<p>3Dモデルの読み込み中</p>}>
      <Park position={[0, -1, 0]} scale={3} />
      <PlayerBoy
        position={[-PLAYER_DISTANCE / 2, 0, 0]}
        animationName={boyAnim}
      />
      <PlayerGirl
        position={[PLAYER_DISTANCE / 2, 0, 0]}
        animationName={girlAnim}
        rotation={[0, -Math.PI, 0]}
      />
    </Suspense>
  </>
);
