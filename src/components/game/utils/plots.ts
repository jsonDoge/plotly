/* eslint-disable no-param-reassign */
import { RefObject } from 'react';
import { PLOT_ASCEND_MAX, PLOT_DESCEND_MAX, PLOT_RISE_STEP, PLOT_SIZE } from './constants';
import { Coordinates, PlotMesh } from './interfaces';

export const getAllPlotCoordinatesAround = (centerX: number, centerY: number): Coordinates[] => {
  const coordinates = [];
  for (let dy = -3; dy < 4; dy += 1) {
    for (let dx = -3; dx < 4; dx += 1) {
      const sumX = centerX + dx;
      const sumY = centerY + dy;
      if (sumX > 999 || sumY > 999 || sumX < 0 || sumY < 0) {
        continue;
      }
      coordinates.push({ x: sumX, y: sumY });
    }
  }
  return coordinates;
};

export const fillGridPositions = (
  grid: Array<Array<RefObject<PlotMesh>>>,
  size: number,
  centerX: number,
  centerY: number,
  options = {
    plotSize: PLOT_SIZE,
    plotDescendMax: PLOT_DESCEND_MAX,
  },
) => {
  const sizeDeviation = (size - 1) / 2; // because odd (5)
  const minValueX = (centerX - sizeDeviation) * options.plotSize;
  const minValueY = (centerY - sizeDeviation) * options.plotSize;

  grid.forEach((row: Array<RefObject<PlotMesh>>, rowIndex: number) => {
    row.forEach((ref: RefObject<PlotMesh>, columnIndex: number) => {
      if (!ref.current) {
        return;
      }
      ref.current.position.set(
        minValueX + columnIndex * options.plotSize,
        minValueY + rowIndex * options.plotSize,
        options.plotDescendMax,
      );

      ref.current.isAscending = true;
    });
  });
};

export const fillSurroundRowPositions = (
  grid: Array<Array<RefObject<PlotMesh>>>,
  size: number,
  centerX: number,
  centerY: number,
  options = {
    plotSize: PLOT_SIZE,
    plotDescendMax: PLOT_DESCEND_MAX,
  },
) => {
  const sizeDeviation = (size - 1) / 2; // because odd (5)
  const minValueX = (centerX - sizeDeviation) * options.plotSize;
  const minValueY = (centerY - sizeDeviation) * options.plotSize;

  // along Y axis
  grid[0].forEach((ref, columnIndex) => {
    if (!ref.current) {
      return;
    }
    ref.current.position.set(minValueX + (columnIndex + 1) * options.plotSize, minValueY, options.plotDescendMax);

    ref.current.castShadow = false;
  });

  grid[1].forEach((ref, columnIndex) => {
    if (!ref.current) {
      return;
    }
    ref.current.position.set(
      minValueX + (columnIndex + 1) * options.plotSize,
      minValueY + (size - 1) * options.plotSize,
      options.plotDescendMax,
    );

    ref.current.castShadow = false;
  });

  // along X axis
  grid[2].forEach((ref, columnIndex) => {
    if (!ref.current) {
      return;
    }
    ref.current.position.set(minValueX, minValueY + (columnIndex + 1) * options.plotSize, options.plotDescendMax);

    ref.current.castShadow = false;
  });

  grid[3].forEach((ref, columnIndex) => {
    if (!ref.current) {
      return;
    }
    ref.current.position.set(
      minValueX + (size - 1) * options.plotSize,
      minValueY + (columnIndex + 1) * options.plotSize,
      options.plotDescendMax,
    );

    ref.current.castShadow = false;
  });
};

export const resetAscendedDescendedPlotParams = (surroundPlotRefs: Array<Array<RefObject<PlotMesh>>>) => {
  if (surroundPlotRefs[0][0].current?.isDescended) {
    surroundPlotRefs[0].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isDescended = false;
      c.current.castShadow = false;
    });
  } else if (surroundPlotRefs[1][0].current?.isDescended) {
    surroundPlotRefs[1].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isDescended = false;
      c.current.castShadow = false;
    });
  } else if (surroundPlotRefs[2][0].current?.isDescended) {
    surroundPlotRefs[2].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isDescended = false;
      c.current.castShadow = false;
    });
  } else if (surroundPlotRefs[3][0].current?.isDescended) {
    surroundPlotRefs[3].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isDescended = false;
      c.current.castShadow = false;
    });
  }
};

const opposingSideSurroundPlotIndex = {
  0: 1,
  1: 0,
  2: 3,
  3: 2,
};

const getOppositeSidesOfAscendedIndexes = (
  isSide0Ascended: boolean,
  isSide1Ascended: boolean,
  isSide2Ascended: boolean,
  isSide3Ascended: boolean,
): number[] => {
  const indexes = [];
  if (isSide0Ascended) {
    indexes.push(opposingSideSurroundPlotIndex[0]);
  }
  if (isSide1Ascended) {
    indexes.push(opposingSideSurroundPlotIndex[1]);
  }
  if (isSide2Ascended) {
    indexes.push(opposingSideSurroundPlotIndex[2]);
  }
  if (isSide3Ascended) {
    indexes.push(opposingSideSurroundPlotIndex[3]);
  }

  return indexes;
};

export const updatePlotPositionAfterAscention = (
  mainPlotRefs: Array<Array<RefObject<PlotMesh>>>,
  surroundPlotRefs: Array<Array<RefObject<PlotMesh>>>,
  options = {
    plotSize: PLOT_SIZE,
    plotAscendMax: PLOT_ASCEND_MAX,
    plotDescendMax: PLOT_DESCEND_MAX,
  },
) => {
  // TODO: logic based on other model movement (probably should depend on center movement)
  const mainPlotYPositionMultiplier =
    (surroundPlotRefs[0][0].current?.isAscended ? -1 : 0) + (surroundPlotRefs[1][0].current?.isAscended ? 1 : 0);

  const mainPlotXPositionMultiplier =
    (surroundPlotRefs[2][0].current?.isAscended ? -1 : 0) + (surroundPlotRefs[3][0].current?.isAscended ? 1 : 0);

  // main plot movement

  mainPlotRefs.forEach((r) =>
    r.forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.position.set(
        c.current.position.x + options.plotSize * mainPlotXPositionMultiplier,
        c.current.position.y + options.plotSize * mainPlotYPositionMultiplier,
        c.current.position.z,
      );
    }),
  );

  // surround plot movement

  const oppositeOfAscendedIndexes = getOppositeSidesOfAscendedIndexes(
    !!surroundPlotRefs[0][0].current?.isAscended,
    !!surroundPlotRefs[1][0].current?.isAscended,
    !!surroundPlotRefs[2][0].current?.isAscended,
    !!surroundPlotRefs[3][0].current?.isAscended,
  );

  surroundPlotRefs.forEach((row, rowIndex) =>
    row.forEach((plot) => {
      if (!plot.current) {
        return;
      }

      let { z } = plot.current.position;

      if (oppositeOfAscendedIndexes.includes(rowIndex)) {
        z = options.plotAscendMax;
        plot.current.isDescending = true;
        plot.current.castShadow = true;
      } else if (plot.current?.isAscended) {
        z = options.plotDescendMax;
        plot.current.castShadow = false;
        plot.current.isAscended = false;
      }

      plot.current?.position.set(
        plot.current.position.x + options.plotSize * mainPlotXPositionMultiplier,
        plot.current.position.y + options.plotSize * mainPlotYPositionMultiplier,
        z,
      );
    }),
  );
};

export const updateSurroundPlotAscention = (
  deviationX: number,
  deviationY: number,
  surroundRefs: Array<Array<RefObject<PlotMesh>>>,
): void => {
  if (deviationY > 0) {
    surroundRefs[1].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isAscending = true;
      c.current.castShadow = true;
    });
  } else if (deviationY < 0) {
    surroundRefs[0].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isAscending = true;
      c.current.castShadow = true;
    });
  }

  if (deviationX > 0) {
    surroundRefs[3].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isAscending = true;
      c.current.castShadow = true;
    });
  } else if (deviationX < 0) {
    surroundRefs[2].forEach((c) => {
      if (!c.current) {
        return;
      }
      c.current.isAscending = true;
      c.current.castShadow = true;
    });
  }
};

export const ascendDescendPlots = (
  plotRefs: Array<Array<RefObject<PlotMesh>>>,
  options = {
    plotRiseStep: PLOT_RISE_STEP,
    plotAscendMax: PLOT_ASCEND_MAX,
    plotDescendMax: PLOT_DESCEND_MAX,
  },
) => {
  plotRefs.forEach((r) =>
    r.forEach((c) => {
      if (!c.current) {
        return;
      }

      if (c.current.isAscending) {
        c.current.position.z += options.plotRiseStep;
        if (c.current.position.z >= options.plotAscendMax) {
          c.current.isAscending = false;
          c.current.isAscended = true;
        }
      } else if (c.current.isDescending) {
        c.current.position.z -= options.plotRiseStep;
        if (c.current.position.z < options.plotDescendMax) {
          c.current.isDescending = false;
          c.current.isDescended = true;
        }
      }
    }),
  );
};
