import getConfig from 'next/config';
import { BigNumber } from 'ethers';
import { getGrowthBlockDuration, getPlantState } from '../../../services/farm';
import { SEED_TYPE } from '../../../utils/constants';
import { Coordinates, MappedPlotInfos } from './interfaces';
import { getDefaultPlotColor, getPlotColor } from './plotColors';

const { publicRuntimeConfig } = getConfig();

const MAX_PLOT_WATER = parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10);
const PLOT_MAX_X = parseInt(publicRuntimeConfig.PLOT_AREA_MAX_X, 10);
const PLOT_MAX_Y = parseInt(publicRuntimeConfig.PLOT_AREA_MAX_Y, 10);
const PLOT_REGEN_RATE = parseInt(publicRuntimeConfig.PLOT_WATER_REGEN_RATE, 10);

const estimatePlotWaterLevel = (plotWaterLevel: number, waterChangeRate: number, blocksElapsed: number) => {
  const plotWaterGained = PLOT_REGEN_RATE * blocksElapsed;

  const availableWaterBlocks = Math.floor((plotWaterLevel + plotWaterGained) / waterChangeRate);

  // if there is not enough water to absorb it will only absorb full blocks of water (as much as all plants drain per block)
  const waterBlocksAbsorbed = availableWaterBlocks >= blocksElapsed ? blocksElapsed : availableWaterBlocks;
  const plotWaterLeft = plotWaterLevel + plotWaterGained - waterBlocksAbsorbed * waterChangeRate;

  if (plotWaterLeft < 0) {
    return 0;
  }

  if (plotWaterLeft > MAX_PLOT_WATER) {
    return MAX_PLOT_WATER;
  }

  return plotWaterLeft;
};

// returns all plant water absorption

const estimatePlantWaterAbsorbed = (
  waterAlreadyAbsorbed: number,
  centerPlotWaterLevel: number,
  centerPlotWaterChange: number,
  centerPlotBlocksPassed: number,
  surroundingPlotWaterLevels: number[],
  surroundingPlotWaterChanges: number[],
  surroundingPlotBlocksPassed: number[],
): number => {
  let waterAbsorbed = waterAlreadyAbsorbed;

  const plotWaterLeft = centerPlotWaterLevel + PLOT_REGEN_RATE * centerPlotBlocksPassed;
  const availableWaterBlocks = Math.floor(plotWaterLeft / centerPlotWaterChange);
  const absorbedWaterBlocks =
    availableWaterBlocks > centerPlotBlocksPassed ? centerPlotBlocksPassed : availableWaterBlocks;

  const centerBlocksAbsorbed = absorbedWaterBlocks * parseInt(publicRuntimeConfig.PLANT_WATER_ABSORB_RATE, 10);

  waterAbsorbed += centerBlocksAbsorbed;

  waterAbsorbed += surroundingPlotWaterLevels
    .map((plotWaterLevel, i) => {
      const sPlotWaterLeft = plotWaterLevel + PLOT_REGEN_RATE * surroundingPlotBlocksPassed[i];
      const sAvailableWaterBlocks = Math.floor(sPlotWaterLeft / surroundingPlotWaterChanges[i]);
      const sAbsorbedWaterBlocks =
        sAvailableWaterBlocks > surroundingPlotBlocksPassed[i] ? surroundingPlotBlocksPassed[i] : sAvailableWaterBlocks;

      return sAbsorbedWaterBlocks * parseInt(publicRuntimeConfig.PLANT_NEIGHBOR_WATER_ABSORB_RATE, 10);
    })
    .reduce((acc, curr) => acc + curr, 0);

  return waterAbsorbed;
};

const getNeighborPlots = (
  plotCoords: Coordinates,
  contractPlots: any[],
  surroundingWaterLogs: any[],
  absoluteCornerX: number,
  absoluteCornerY: number,
): any[] => {
  const neighborPlots = [];

  // upper
  if (absoluteCornerY === PLOT_MAX_Y - 6 && plotCoords.y === 6) {
    // do nothing
  } else if (plotCoords.y === 6) {
    neighborPlots.push({ waterLog: surroundingWaterLogs[3 * 7 + plotCoords.x] });
  } else {
    neighborPlots.push(contractPlots[(plotCoords.y + 1) * 7 + plotCoords.x]);
  }

  // lower
  if (absoluteCornerY === 0 && plotCoords.y === 0) {
    // do nothing
  } else if (plotCoords.y === 0) {
    neighborPlots.push({ waterLog: surroundingWaterLogs[2 * 7 + plotCoords.x] });
  } else {
    neighborPlots.push(contractPlots[(plotCoords.y - 1) * 7 + plotCoords.x]);
  }

  // right
  if (absoluteCornerX === PLOT_MAX_X - 6 && plotCoords.x === 6) {
    // do nothing
  } else if (plotCoords.x === 6) {
    neighborPlots.push({ waterLog: surroundingWaterLogs[1 * 7 + plotCoords.y] });
  } else {
    neighborPlots.push(contractPlots[plotCoords.y * 7 + plotCoords.x + 1]);
  }

  // left
  if (absoluteCornerX === 0 && plotCoords.x === 0) {
    // do nothing
  } else if (plotCoords.x === 0) {
    neighborPlots.push({ waterLog: surroundingWaterLogs[plotCoords.y] });
  } else {
    neighborPlots.push(contractPlots[plotCoords.y * 7 + plotCoords.x - 1]);
  }

  return neighborPlots;
};

// TODO: function is growing too big, refactor
export const reduceContractPlots = (
  contractPlots: any[], // 49 plots
  surroundingWaterLogs: any[], // 28 plots (line on each side of the 7x7 grid - look in contracts for more info)
  currentBlock: number,
  walletAddress: string,

  // actual plot coordinates
  absoluteCornerX: number,
  absoluteCornerY: number,
): MappedPlotInfos =>
  contractPlots.reduce((mp: MappedPlotInfos, plot: any, i) => {
    const plotCoords = { x: i % 7, y: Math.floor(i / 7) };

    const updatedMp = {
      ...mp,
      [plotCoords.x]: {
        ...mp[plotCoords.x],
      },
    };

    const lastKnownPlotWaterLevel =
      plot.waterLog?.level?.toNumber() || parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10);
    const lastKnownPlotWaterChange = plot.waterLog?.changeRate?.toNumber() || 0;

    const centerPlotBlockDiff = currentBlock - (plot.waterLog?.blockNumber?.toNumber() || 0);
    // if block diff is negative, it means the game has not updated to the latest block yet
    const centerPlotBlocksPassed = centerPlotBlockDiff < 0 ? 0 : centerPlotBlockDiff;

    const currentPlotWaterLevel = estimatePlotWaterLevel(
      lastKnownPlotWaterLevel,
      lastKnownPlotWaterChange,
      centerPlotBlocksPassed,
    );

    // manual calculations until current block
    if (plot.owner === '0x0000000000000000000000000000000000000000') {
      const isOwner = false;
      const isPlantOwner = false;
      const isUnminted = true;

      updatedMp[plotCoords.x][plotCoords.y] = {
        isOwner: false,
        isPlantOwner: false,
        isUnminted: true,

        // plant
        seedType: undefined,
        plantState: undefined,
        waterAbsorbed: undefined,
        plantedBlockNumber: undefined,
        overgrownBlockNumber: undefined,

        // plot
        color: getPlotColor(isOwner, isPlantOwner, isUnminted),
        lastStateChangeBlock: plot.waterLog?.blockNumber?.toNumber() || 0,
        waterLevel: currentPlotWaterLevel,
      };

      return updatedMp;
    }

    const isOwner = plot.owner.toLowerCase() === walletAddress;
    const isPlantOwner = plot?.plant?.owner?.toLowerCase() === walletAddress;
    const isUnminted = false;

    const seedType: string = Object.values(SEED_TYPE).filter(
      (t) => publicRuntimeConfig[`C_${t}_SEED`]?.toLowerCase() === plot.plant.seed.toLowerCase(),
    )[0];

    if (!seedType) {
      updatedMp[plotCoords.x][plotCoords.y] = {
        isOwner,
        isPlantOwner,
        isUnminted,

        // plant
        seedType: undefined,
        plantState: undefined,
        waterAbsorbed: undefined,
        plantedBlockNumber: undefined,
        overgrownBlockNumber: undefined,

        // plot
        color: getPlotColor(isOwner, isPlantOwner, isUnminted),
        lastStateChangeBlock: plot.waterLog?.blockNumber?.toNumber() || 0,
        waterLevel: currentPlotWaterLevel,
      };

      return updatedMp;
    }

    const growthBlockDuration = getGrowthBlockDuration(seedType);

    const neighborPlots = getNeighborPlots(
      plotCoords,
      contractPlots,
      surroundingWaterLogs,
      absoluteCornerX,
      absoluteCornerY,
    );

    const waterAbsorbed = estimatePlantWaterAbsorbed(
      plot?.plant?.waterAbsorbed?.toNumber() || 0,
      lastKnownPlotWaterLevel,
      lastKnownPlotWaterChange,
      centerPlotBlocksPassed,
      neighborPlots.map((np) => np.waterLog?.level?.toNumber() || parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10)),
      neighborPlots.map((np) => np.waterLog?.changeRate?.toNumber() || 0),
      neighborPlots.map((np) =>
        currentBlock - (np.waterLog?.blockNumber?.toNumber() || 0) < 0
          ? 0
          : currentBlock - (np.waterLog?.blockNumber?.toNumber() || 0),
      ),
    );

    const plantState = getPlantState(
      BigNumber.from(currentBlock),
      plot.plant.plantedBlockNumber,
      plot.plant.overgrownBlockNumber,
      BigNumber.from(growthBlockDuration),
    );

    updatedMp[plotCoords.x][plotCoords.y] = {
      isOwner,
      isPlantOwner,
      isUnminted,

      // plant
      seedType,
      plantState,
      waterAbsorbed,
      plantedBlockNumber: plot.plant.plantedBlockNumber.toNumber(),
      overgrownBlockNumber: plot.plant.overgrownBlockNumber.toNumber(),

      // plot
      color: getPlotColor(isOwner, isPlantOwner, isUnminted),
      lastStateChangeBlock: plot.waterLog?.blockNumber?.toNumber() || 0,
      waterLevel: currentPlotWaterLevel,
    };

    return updatedMp;
  }, {});

export const getEmptyPlotInfo = () => ({
  isOwner: false,
  isPlantOwner: false,
  isUnminted: true,

  // plant
  seedType: undefined,
  plantState: undefined,
  waterAbsorbed: undefined,
  plantedBlockNumber: undefined,
  overgrownBlockNumber: undefined,
  // plot
  color: getDefaultPlotColor(),
  lastStateChangeBlock: 0,
  waterLevel: parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10),
});

// eslint-disable-next-line import/prefer-default-export
export const generateEmptyMappedPlotInfos = (coords: Coordinates[]): MappedPlotInfos =>
  coords.reduce(
    (mpi: MappedPlotInfos, c: Coordinates) => ({
      ...mpi,
      [c.x]: {
        ...mpi[c.x],
        [c.y]: getEmptyPlotInfo(),
      },
    }),
    {},
  );
