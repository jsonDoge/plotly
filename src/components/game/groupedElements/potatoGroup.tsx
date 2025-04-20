import * as THREE from 'three';
import React, { forwardRef } from 'react';
import Potato from '../modelElements/potato';

const PotatoGroup = forwardRef<THREE.Group>((_, ref) => {
  const position1 = new THREE.Vector3(-0.5, 0.2, 0.12);
  const position2 = new THREE.Vector3(-0.1, -0.4, 0.05);
  const position3 = new THREE.Vector3(0.7, 0, 0.12);

  return (
    <group
      ref={ref}
      // so wouldnt appear in [0, 0, 0] initially
      position={[-100, -100, -100]}
    >
      <Potato position={position1} />
      <Potato rotation={[0.5, 0, 0]} position={position2} />
      <Potato rotation={[0, 0.5, 0]} position={position3} />
    </group>
  );
});

export default PotatoGroup;
