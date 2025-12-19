"use client";

import { useGLTF } from "@react-three/drei";
import type React from "react";
import type * as THREE from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    ball: THREE.Mesh;
    トーラス001: THREE.Mesh;
  };
  materials: {
    ball: THREE.MeshStandardMaterial;
    red: THREE.MeshStandardMaterial;
  };
};

export function BaseBall(props: React.JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "./model/baseball.glb",
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.ball.geometry} material={materials.ball} />
      <mesh geometry={nodes.トーラス001.geometry} material={materials.red} />
    </group>
  );
}

useGLTF.preload("/baseball.glb");
