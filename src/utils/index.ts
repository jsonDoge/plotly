import { SEED_TYPE } from './constants';

// eslint-disable-next-line import/prefer-default-export
export const toSentenceCase = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
export const seedTypeToEmoji = (seedType: string): string => {
  switch (seedType) {
    case SEED_TYPE.CARROT:
      return '🥕';
    case SEED_TYPE.CORN:
      return '🌽';
    case SEED_TYPE.POTATO:
      return '🥔';
    default:
      return '';
  }
};
