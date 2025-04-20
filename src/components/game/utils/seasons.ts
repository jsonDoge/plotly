/* eslint-disable no-bitwise */
import getConfig from 'next/config';

import { Season } from '../../../utils/enums';
import { SEED_TYPE, SeedType } from '../../../utils/constants';

const { publicRuntimeConfig } = getConfig();

export const calculateSeason = (blockNumber: number, seasonBlockDuration: number): Season => {
  // mod by year duration
  const moduleBlockNumber = blockNumber % (4 * seasonBlockDuration);

  if (moduleBlockNumber / seasonBlockDuration < 1) {
    return Season.WINTER;
  }
  if (moduleBlockNumber / seasonBlockDuration < 2) {
    return Season.SPRING;
  }
  if (moduleBlockNumber / seasonBlockDuration < 3) {
    return Season.SUMMER;
  }

  return Season.AUTUMN;
};

export const getSeedSeasonBits = (seedType: string): number => {
  switch (seedType) {
    case SEED_TYPE.CARROT:
      return publicRuntimeConfig.CARROT_GROWTH_SEASONS;
    case SEED_TYPE.CORN:
      return publicRuntimeConfig.CORN_GROWTH_SEASONS;
    case SEED_TYPE.POTATO:
      return publicRuntimeConfig.POTATO_GROWTH_SEASONS;
    default:
      return 0;
  }
};

const convertBitsToSeasons = (bits: number): Season[] => {
  const seasons: Season[] = [];

  if (bits & 1) {
    seasons.push(Season.WINTER);
  }
  if (bits & 2) {
    seasons.push(Season.SPRING);
  }
  if (bits & 4) {
    seasons.push(Season.SUMMER);
  }
  if (bits & 8) {
    seasons.push(Season.AUTUMN);
  }

  return seasons;
};

export const isPlantSeason = (seedType: string, season: Season): boolean => {
  const seasonBits = getSeedSeasonBits(seedType);
  const plantSeasons = convertBitsToSeasons(seasonBits);
  return plantSeasons.includes(season);
};

export const getSeasonSeedTypes = (season: Season): SeedType[] =>
  Object.values(SEED_TYPE)
    .map((seedType) => {
      if (isPlantSeason(seedType, season)) {
        return seedType;
      }
      return null;
    })
    .filter((e): e is SeedType => !!e);
