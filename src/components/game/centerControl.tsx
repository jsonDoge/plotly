/* eslint-disable no-param-reassign */
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import { CENTER_AREA_LIMIT, PLOT_SIZE } from './utils/constants';
import { Coordinates } from './utils/interfaces';
import { ValidKeyCode } from './utils/types';

enum KeyCodes {
  KeyW = 'w',
  KeyS = 's',
  KeyA = 'a',
  KeyD = 'd',
  ArrowUp = 'w',
  ArrowDown = 's',
  ArrowLeft = 'a',
  ArrowRight = 'd',
}

const validKeyCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

interface Props {
  centerRef: React.MutableRefObject<{ x: number; y: number }>;
  plotCenterRef: React.MutableRefObject<{ x: number; y: number }>;
  plotCenterChanged: () => void;
}

interface KeysDown {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

const CenterControl = ({ centerRef, plotCenterRef, plotCenterChanged }: Props) => {
  console.info('Rendering centerControl');

  let previousPlotCenter: Coordinates;
  const keysDown = useRef<KeysDown>({
    w: false,
    a: false,
    s: false,
    d: false,
  });

  const updateWasdStateOnDown = (e: KeyboardEvent) => {
    if (!validKeyCodes.includes(e.code)) {
      return;
    }

    const key = KeyCodes[e.code as ValidKeyCode];
    keysDown.current[key] = true;
  };

  const updateWasdStateOnUp = (e: KeyboardEvent) => {
    if (!validKeyCodes.includes(e.code)) {
      return;
    }

    const key = KeyCodes[e.code as ValidKeyCode];
    keysDown.current[key] = false;
  };

  const getNewPositionOnKeyDown = (position: { x: number; y: number }, keysDown_: KeysDown) => {
    if (!keysDown_.w && !keysDown_.s && !keysDown_.a && !keysDown_.d) {
      return position;
    }

    const yChangeMultiplier =
      (keysDown_.w ? 1 : 0) + (keysDown_.d ? 1 : 0) + (keysDown_.s ? -1 : 0) + (keysDown_.a ? -1 : 0);
    const xChangeMultiplier =
      (keysDown_.s ? 1 : 0) + (keysDown_.d ? 1 : 0) + (keysDown_.w ? -1 : 0) + (keysDown_.a ? -1 : 0);

    let newY = position.y + 0.075 * yChangeMultiplier;
    let newX = position.x + 0.075 * xChangeMultiplier;

    if (CENTER_AREA_LIMIT.x0 > newX || CENTER_AREA_LIMIT.x1 < newX) {
      newX = position.x;
    }

    if (CENTER_AREA_LIMIT.y0 > newY || CENTER_AREA_LIMIT.y1 < newY) {
      newY = position.y;
    }

    return {
      x: newX,
      y: newY,
    };
  };

  useFrame(() => {
    if (!centerRef?.current) {
      return;
    }
    plotCenterRef.current.x = Math.floor(centerRef.current.x / PLOT_SIZE);
    plotCenterRef.current.y = Math.floor(centerRef.current.y / PLOT_SIZE);

    if (
      previousPlotCenter &&
      previousPlotCenter.x === plotCenterRef.current.x &&
      previousPlotCenter.y === plotCenterRef.current.y
    ) {
      return;
    }

    previousPlotCenter = { ...plotCenterRef.current };

    plotCenterChanged();
  });

  useFrame(() => {
    centerRef.current = getNewPositionOnKeyDown(centerRef.current, keysDown.current);
  });

  useEffect(() => {
    window.addEventListener('keydown', updateWasdStateOnDown);
    window.addEventListener('keyup', updateWasdStateOnUp);

    return () => {
      window.removeEventListener('keydown', updateWasdStateOnDown);
      window.removeEventListener('keyup', updateWasdStateOnUp);
    };
  }, []);

  // TODO: refactor maybe component is not needed (also THREE.js doesnt like divs)
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
};

export default CenterControl;
