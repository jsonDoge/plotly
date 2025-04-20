import * as THREE from 'three';
import React, { forwardRef } from 'react';
import Corn from '../modelElements/corn';

const CornGroup = forwardRef<THREE.Group>((_, ref) => {
  const position1 = new THREE.Vector3(-0.4, 0, 0.09);
  const position2 = new THREE.Vector3(0.2, -0.4, 0.12);
  const position3 = new THREE.Vector3(0.3, -0.1, 0.12);

  return (
    <group
      ref={ref}
      // so wouldnt appear in [0, 0, 0] initially
      position={[-100, -100, -100]}
    >
      <Corn position={position1} />
      <Corn rotation={[0.1, 0, 2]} position={position2} />
      <Corn rotation={[0, 0.9, 0.1]} position={position3} />
    </group>
  );
});

export default CornGroup;
