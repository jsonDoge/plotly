import React, { forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTFResult } from '../utils/interfaces';

useGLTF.preload('/grass.gltf');

const Grass = forwardRef<THREE.Mesh>((_, ref) => {
  const { nodes, materials } = useGLTF('/grass.gltf') as GLTFResult;

  return (
    <mesh ref={ref} scale={[0.07, 0.07, 0.07]} castShadow receiveShadow geometry={nodes.Cube.geometry}>
      <meshStandardMaterial {...materials.Material} />
    </mesh>
  );
});

export default Grass;
