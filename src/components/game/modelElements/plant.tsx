import React, { forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTFResult } from '../utils/interfaces';

useGLTF.preload('/plant.gltf');

const Plant = forwardRef<THREE.Mesh>((_, ref) => {
  const { nodes, materials } = useGLTF('/plant.gltf') as GLTFResult;
  materials.Material.transparent = true;
  materials.Material.opacity = 1;
  return (
    <mesh
      ref={ref}
      // so wouldnt appear in [0, 0, 0] initially (visible to user)
      position={[-100, -100, -100]}
      scale={[0.3, 0.3, 0.3]}
      rotation={[90 * (Math.PI / 180), 0, 0]}
      castShadow
      receiveShadow
      geometry={nodes.Cube.geometry}
      material={materials.Material}
    />
  );
});

export default Plant;
