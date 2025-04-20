/* eslint-disable import/prefer-default-export */
import { MathUtils } from 'three';

export const coordinatePseudoRand = (
  x: number,
  y: number,
  // eslint-disable-next-line no-bitwise, no-mixed-operators
): number => MathUtils.seededRandom(((x << 10) | y) * 39916801);
