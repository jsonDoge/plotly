import { RefObject } from 'react';
import { roundAdd } from '.';
import { INVISIBLE_AREA_SIZE, PLOT_SIZE, TRANSAPRENT_AREA_SIZE } from './constants';
import { coordinatePseudoRand } from './pseudoRandom';
import { GetAreNumbersEqualRoot, GetAreNumbersEqual, BackgroundModelParams, ModelMesh } from './interfaces';
import { Probability } from './enums';
import { Area } from './types';

// only works for large decimal numbers
const getDigitOfNumber = (n: number, digitIndex: number): number =>
  parseInt(n.toString().split('.').join('')[digitIndex], 10);

const convertNumberToAngle = (n: number) => (n % 4) * 90;

const getBackgroundModelParams = (
  lowestX: number,
  lowestY: number,
  step: number,
  size: number,
  invisibleArea: Area,
  semiTransparentArea: Area,
  getAreNumbersEqual: GetAreNumbersEqual,
  probability: Probability,
) => {
  const backgroundObjects: Array<BackgroundModelParams> = [];

  const { x0: ix0, x1: ix1, y0: iy0, y1: iy1 } = invisibleArea;
  const { x0: sx0, x1: sx1, y0: sy0, y1: sy1 } = semiTransparentArea;

  for (let y = lowestY; y < lowestY + size; y = roundAdd(y, step)) {
    for (let x = lowestX; x < lowestX + size; x = roundAdd(x, step)) {
      const multiplier = probability === Probability.high ? 10 : 100;

      // TODO: noticable repeatability when provided coordinates > 400 PLOTS and < 0 PLOTS
      // current solutions:
      // - loop 400 after PLOTS
      // - abs() negative coordinates

      // eslint-disable-next-line no-mixed-operators
      const positionRand =
        coordinatePseudoRand(Math.abs(x) % (400 * PLOT_SIZE), Math.abs(y) % (400 * PLOT_SIZE)) * multiplier;
      const positionRandDigit = getDigitOfNumber(positionRand, Math.round(positionRand));
      const isPositionFilled = positionRandDigit && getAreNumbersEqual(positionRandDigit);

      if (!isPositionFilled) {
        continue;
      }

      const rotationRand = coordinatePseudoRand(x, y) * 10;
      const rotationRandDigit = getDigitOfNumber(rotationRand, Math.round(positionRand));
      const rotation = convertNumberToAngle(rotationRandDigit);

      const isInvisible = x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1;
      const isSemiTransparent = x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1;

      backgroundObjects.push({
        isVisible: !isInvisible,
        isSemiTransparent,
        position: [x, y, 0],
        rotation: [90 * (Math.PI / 180), rotation * (Math.PI / 180), 0],
      });
    }
  }
  return backgroundObjects;
};

// TODO: improve function naming
const getAreNumbersEqualRoot: GetAreNumbersEqualRoot =
  (equalTo: number) =>
  (n: number): boolean =>
    n === equalTo;

const updateBackgroundModelsToParams = (
  backgroundObjectRefs: Array<RefObject<ModelMesh>>,
  modelParams: Array<BackgroundModelParams>,
) =>
  backgroundObjectRefs.forEach((ref, i) => {
    if (!ref.current) {
      return;
    }
    if (!modelParams[i]) {
      ref.current.position.set(-100, -100, 0);
      return;
    }

    ref.current.position.set(...modelParams[i].position);
    ref.current.rotation.set(...modelParams[i].rotation);
    // eslint-disable-next-line no-param-reassign
    ref.current.visible = modelParams[i].isVisible;

    if (modelParams[i].isSemiTransparent) {
      ref.current.material.setValues({
        opacity: 0.1,
        transparent: true,
      });
    } else {
      ref.current.material.setValues({
        opacity: 1,
        transparent: false,
      });
    }
  });

const getInvisibleArea = (center: { x: number; y: number }): Area => ({
  x0: center.x - INVISIBLE_AREA_SIZE,
  y0: center.y - INVISIBLE_AREA_SIZE,
  x1: center.x + INVISIBLE_AREA_SIZE,
  y1: center.y + INVISIBLE_AREA_SIZE,
});

const getSemiTransparentArea = (center: { x: number; y: number }): Area => ({
  x0: center.x - TRANSAPRENT_AREA_SIZE,
  y0: center.y - TRANSAPRENT_AREA_SIZE,
  x1: center.x + TRANSAPRENT_AREA_SIZE,
  y1: center.y + TRANSAPRENT_AREA_SIZE,
});

export {
  getBackgroundModelParams,
  getAreNumbersEqualRoot,
  getDigitOfNumber,
  updateBackgroundModelsToParams,
  getInvisibleArea,
  getSemiTransparentArea,
};
