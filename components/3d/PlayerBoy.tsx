"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import React, { useEffect } from "react";
/* src/components/Player_boy.tsx */
import * as THREE from "three";
import { type GLTF, SkeletonUtils } from "three-stdlib";

// アニメーション名の定義
type ActionName =
  | "catch_before"
  | "catch_LL"
  | "catch_LM"
  | "catch_LR"
  | "catch_ML"
  | "catch_MM"
  | "catch_MR"
  | "catch_UL"
  | "catch_UM"
  | "catch_UR"
  | "miss"
  | "normal"
  | "throw"
  | "throw_light";

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    body: THREE.SkinnedMesh;
    Mesh: THREE.SkinnedMesh;
    Mesh_1: THREE.SkinnedMesh;
    Mesh_2: THREE.SkinnedMesh;
    Mesh_3: THREE.SkinnedMesh;
    left_foot: THREE.SkinnedMesh;
    left_hand: THREE.SkinnedMesh;
    right_foot: THREE.SkinnedMesh;
    Sphere007: THREE.SkinnedMesh;
    Sphere007_1: THREE.SkinnedMesh;
    Sphere007_2: THREE.SkinnedMesh;
    Sphere007_3: THREE.SkinnedMesh;
    Bone: THREE.Bone;
    hip_L: THREE.Bone;
    hip_R: THREE.Bone;
  };
  materials: {
    body: THREE.MeshStandardMaterial;
    face: THREE.MeshStandardMaterial;
    hair: THREE.MeshStandardMaterial;
    white: THREE.MeshStandardMaterial;
    blue: THREE.MeshStandardMaterial;
    foot: THREE.MeshStandardMaterial;
    hand: THREE.MeshStandardMaterial;
    globe_main: THREE.MeshStandardMaterial;
    globe_label: THREE.MeshStandardMaterial;
    globe_label_outside: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

// Propsの定義：animationNameを受け取れるように拡張
type PlayerBoyProps = React.JSX.IntrinsicElements["group"] & {
  animationName?: ActionName;
};

export function PlayerBoy({
  animationName = "normal",
  ...props
}: PlayerBoyProps) {
  const group = React.useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/model/player_boy.glb");

  // シーンのクローン（複数配置対応）
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;

  // アニメーションフック
  const { actions } = useAnimations(animations, group);

  // アニメーション再生ロジック
  useEffect(() => {
    const action = actions[animationName];

    if (action) {
      // フェード時間の調整（キャッチへの移行は素早く、それ以外は滑らかに）
      const fadeTime =
        animationName?.startsWith("catch") && animationName !== "catch_before"
          ? 0.1
          : 0.5;

      action.reset().fadeIn(fadeTime);

      // 'throw' (投げる) または 'catch' (捕る) 系の動作なら1回再生で止める
      if (
        animationName === "throw" ||
        (animationName &&
          animationName.startsWith("catch_") &&
          animationName !== "catch_before")
      ) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        // normal (待機) や catch_before (構え) はループ
        action.setLoop(THREE.LoopRepeat, Infinity);
      }

      action.play();

      return () => {
        action.fadeOut(fadeTime);
      };
    }
  }, [actions, animationName]);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="Armature" position={[0, 2.18, 0]}>
          <primitive object={nodes.Bone} />
          <primitive object={nodes.hip_L} />
          <primitive object={nodes.hip_R} />
          <skinnedMesh
            name="body"
            geometry={nodes.body.geometry}
            material={materials.body}
            skeleton={nodes.body.skeleton}
          />
          <group name="face1">
            <skinnedMesh
              name="Mesh"
              geometry={nodes.Mesh.geometry}
              material={materials.face}
              skeleton={nodes.Mesh.skeleton}
            />
            <skinnedMesh
              name="Mesh_1"
              geometry={nodes.Mesh_1.geometry}
              material={materials.hair}
              skeleton={nodes.Mesh_1.skeleton}
            />
            <skinnedMesh
              name="Mesh_2"
              geometry={nodes.Mesh_2.geometry}
              material={materials.white}
              skeleton={nodes.Mesh_2.skeleton}
            />
            <skinnedMesh
              name="Mesh_3"
              geometry={nodes.Mesh_3.geometry}
              material={materials.blue}
              skeleton={nodes.Mesh_3.skeleton}
            />
          </group>
          <skinnedMesh
            name="left_foot"
            geometry={nodes.left_foot.geometry}
            material={materials.foot}
            skeleton={nodes.left_foot.skeleton}
          />
          <skinnedMesh
            name="left_hand"
            geometry={nodes.left_hand.geometry}
            material={materials.hand}
            skeleton={nodes.left_hand.skeleton}
          />
          <skinnedMesh
            name="right_foot"
            geometry={nodes.right_foot.geometry}
            material={materials.foot}
            skeleton={nodes.right_foot.skeleton}
          />
          <group name="right_hand">
            <skinnedMesh
              name="Sphere007"
              geometry={nodes.Sphere007.geometry}
              material={materials.globe_main}
              skeleton={nodes.Sphere007.skeleton}
            />
            <skinnedMesh
              name="Sphere007_1"
              geometry={nodes.Sphere007_1.geometry}
              material={materials.globe_label}
              skeleton={nodes.Sphere007_1.skeleton}
            />
            <skinnedMesh
              name="Sphere007_2"
              geometry={nodes.Sphere007_2.geometry}
              material={materials.globe_label_outside}
              skeleton={nodes.Sphere007_2.skeleton}
            />
            <skinnedMesh
              name="Sphere007_3"
              geometry={nodes.Sphere007_3.geometry}
              material={nodes.Sphere007_3.material}
              skeleton={nodes.Sphere007_3.skeleton}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/model/player_boy.glb");
