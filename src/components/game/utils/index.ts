/* eslint-disable no-param-reassign */
import { createRef, RefObject } from 'react';
import { PLOT_SIZE } from './constants';
import { Area, AreaKeys } from './types';

export const generateRefGrid = <Type>(sizeX: number, sizeY: number): Array<Array<RefObject<Type>>> => {
  const refs: Array<Array<RefObject<Type>>> = [];
  for (let y = 0; y < sizeY; y += 1) {
    if (!refs[y]) {
      refs[y] = [];
    }
    for (let x = 0; x < sizeX; x += 1) {
      refs[y][x] = createRef<Type>();
    }
  }
  return refs;
};

export const normalizePlotDimension = (dimension: number) => Math.round(dimension * PLOT_SIZE * 10) / 10;
export const normalizePlotArea = (area: Area): Area =>
  (Object.keys(area) as AreaKeys[]).reduce<Area>((acc, val) => ({ ...acc, [val]: normalizePlotDimension(area[val]) }), {
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
  });
export const roundAdd = (x: number, y: number) => Math.round((x + y) * 10) / 10;
