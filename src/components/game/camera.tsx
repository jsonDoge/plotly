import React, { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3Tuple } from 'three';

interface Props {
  centerRef: React.MutableRefObject<{ x: number; y: number }>;
}

const perspectiveCameraOffset = {
  x: 9.2,
  y: -8.8,
  z: 10,
};

const Camera: React.FC<Props> = ({ centerRef }) => {
  console.info('Rendering camera');

  const perspectiveCameraRef = useRef<PerspectiveCamera>(null);

  const { size, set } = useThree();

  const cameraInitialPosition: Vector3Tuple = [
    perspectiveCameraOffset.x + centerRef.current.x,
    perspectiveCameraOffset.y + centerRef.current.y,
    perspectiveCameraOffset.z,
  ];

  useLayoutEffect(() => {
    if (!perspectiveCameraRef?.current) {
      return;
    }

    set({ camera: perspectiveCameraRef.current });
  }, [perspectiveCameraRef?.current]);

  useFrame((state) => {
    // TODO: investigate if necessary
    state.camera.updateProjectionMatrix();

    if (!perspectiveCameraRef?.current) {
      return;
    }

    perspectiveCameraRef.current.position.x = centerRef.current.x + perspectiveCameraOffset.x;
    perspectiveCameraRef.current.position.y = centerRef.current.y + perspectiveCameraOffset.y;
  });

  return (
    <perspectiveCamera
      ref={perspectiveCameraRef}
      aspect={size.width / size.height}
      position={cameraInitialPosition}
      fov={65}
      near={1}
      far={10000}
      rotation={[30 * (Math.PI / 180), 30 * (Math.PI / 180), 40 * (Math.PI / 180)]}
      onUpdate={(self: any) => self.updateProjectionMatrix()}
    />
  );
};

export default Camera;
