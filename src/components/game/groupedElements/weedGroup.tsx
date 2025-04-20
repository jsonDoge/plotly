import * as THREE from 'three';
import React, { forwardRef } from 'react';
import Weed from '../modelElements/weed';

const WeedGroup = forwardRef<THREE.Group>((_, ref) => {
  const weedPosition1 = new THREE.Vector3(0.5, 0.3, 0);
  const weedPosition2 = new THREE.Vector3(-0.5, 0.3, 0);
  const weedPosition3 = new THREE.Vector3(0.7, -0.3, 0);
  const weedPosition4 = new THREE.Vector3(-0.5, -0.3, 0);
  const weedPosition5 = new THREE.Vector3(0, -0.7, 0);

  return (
    <group
      ref={ref}
      // so wouldnt appear in [0, 0, 0] initially
      position={[-100, -100, -100]}
    >
      <Weed position={weedPosition1} />
      <Weed position={weedPosition2} />
      <Weed position={weedPosition3} />
      <Weed position={weedPosition4} />
      <Weed position={weedPosition5} />
    </group>
  );
});

export default WeedGroup;
