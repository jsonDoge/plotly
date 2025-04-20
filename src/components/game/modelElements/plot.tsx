import * as THREE from 'three';
import React, { forwardRef } from 'react';
import { PlotMesh } from '../utils/interfaces';
import { getDefaultPlotColor } from '../utils/plotColors';

interface Props {
  onPointerDown?: () => void;
  onPointerOut?: (self: any) => void;
  onPointerOver?: (self: any) => void;
}

const Plot = forwardRef<PlotMesh, Props>((props, ref) => {
  const defaultColor = getDefaultPlotColor();
  return (
    <mesh ref={ref} {...props} castShadow receiveShadow>
      <boxGeometry args={[2, 2, 0.2]} />
      <meshStandardMaterial color={new THREE.Color(defaultColor.hex)} />
    </mesh>
  );
});

export default Plot;
