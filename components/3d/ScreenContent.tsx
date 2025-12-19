import { Sky } from "@react-three/drei";
import { Suspense } from "react";
import type { ActionName } from "@/types/animation";
import { MovingBall } from "./MovingBall";
import { Park } from "./Park";
import { PlayerBoy } from "./PlayerBoy";
import { PlayerGirl } from "./PlayerGirl";

const PLAYER_DISTANCE = 50;

export const SceneContent = ({
  boyAnim,
  girlAnim,
  ballProps,
}: {
  boyAnim: ActionName;
  girlAnim: ActionName;
  ballProps: any;
}) => (
  <>
    <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.4} />
    <ambientLight intensity={0.8} />
    <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
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
      <MovingBall {...ballProps} />
    </Suspense>
  </>
);
