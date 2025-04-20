import React, { forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTFResult } from '../utils/interfaces';

useGLTF.preload('/fir.gltf');

const Fir = forwardRef<THREE.Mesh>((_, ref) => {
  const { nodes, materials } = useGLTF('/fir.gltf') as GLTFResult;

  return (
    <mesh
      ref={ref}
      rotation={[90 * (Math.PI / 180), 0, 0]}
      scale={[0.5, 0.5, 0.5]}
      castShadow
      receiveShadow
      geometry={nodes.Cube.geometry}
    >
      <meshStandardMaterial {...materials.Material} />
    </mesh>
  );
});

export default Fir;
