import React, { forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Vector3 } from '@react-three/fiber';
import { GLTFResult } from '../utils/interfaces';

interface Props {
  position: Vector3;
}

useGLTF.preload('/potato.gltf');

const Potato = forwardRef<THREE.Mesh, Props>((props, ref) => {
  const { nodes, materials } = useGLTF('/potato.gltf') as GLTFResult;
  materials.Material.transparent = true;
  materials.Material.opacity = 1;

  return (
    <mesh
      ref={ref}
      {...props}
      scale={[0.1, 0.1, 0.1]}
      castShadow
      receiveShadow
      geometry={nodes.Cube.geometry}
      material={materials.Material}
    />
  );
});

export default Potato;
