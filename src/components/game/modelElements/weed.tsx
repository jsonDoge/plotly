import React from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTFResult } from '../utils/interfaces';

interface Props {
  position: THREE.Vector3;
}

useGLTF.preload('/weed.gltf');

const Weed: React.FC<Props> = (props) => {
  const { nodes, materials } = useGLTF('/weed.gltf') as GLTFResult;
  materials.Material.transparent = true;
  materials.Material.opacity = 1;

  return (
    <mesh
      scale={[0.07, 0.07, 0.07]}
      rotation={[90 * (Math.PI / 180), 0, 0]}
      castShadow
      receiveShadow
      geometry={nodes.Cube.geometry}
      material={materials.Material}
      {...props}
    />
  );
};

export default Weed;
