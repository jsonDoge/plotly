import * as THREE from 'three';
import React, { forwardRef } from 'react';
import Carrot from '../modelElements/carrot';

const CarrotGroup = forwardRef<THREE.Group>((_, ref) => {
  const position1 = new THREE.Vector3(-0.4, 0, 0.09);
  const position2 = new THREE.Vector3(-0.1, -0.5, 0.05);
  const position3 = new THREE.Vector3(0.3, -0.1, 0.12);

  return (
    <group
      ref={ref}
      // so wouldnt appear in [0, 0, 0] initially
      position={[-100, -100, -100]}
    >
      <Carrot position={position1} />
      <Carrot rotation={[0.1, 0, 1]} position={position2} />
      <Carrot rotation={[0, 0.5, -0.3]} position={position3} />
    </group>
  );
});

export default CarrotGroup;
