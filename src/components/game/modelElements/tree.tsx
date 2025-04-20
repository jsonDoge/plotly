import React, { forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTFResult } from '../utils/interfaces';

useGLTF.preload('/tree.gltf');

// TODO: swap out to instancedMesh for better performance

const Tree = forwardRef<THREE.Mesh>((_, ref) => {
  const { nodes, materials } = useGLTF('/tree.gltf') as GLTFResult;

  return (
    <mesh ref={ref} scale={[0.5, 0.5, 0.5]} castShadow receiveShadow geometry={nodes.Cube.geometry}>
      <meshStandardMaterial {...materials.Material} />
    </mesh>
  );
});

export default Tree;
