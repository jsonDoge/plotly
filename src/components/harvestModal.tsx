import React, { useEffect, useState } from 'react';
import getConfig from 'next/config';

import Button from './button';
import { SeedType, SEED_TYPE } from '../utils/constants';
import { PlotInfo } from './game/utils/interfaces';
import { seedTypeToEmoji, toSentenceCase } from '../utils';

const { publicRuntimeConfig } = getConfig();

const getHarvestState = (
  seedType: SeedType,
  seasonSeedTypes: SeedType[],
  blocksGrown: number,
  blocksRequired: number,
  waterAbsorbed: number,
  waterRequired: number,
  blocksTillOvergrown: number,
): { text: string; isHarvestable: boolean } => {
  if (blocksTillOvergrown <= 0) {
    return {
      text: `${toSentenceCase(seedType)} has overgrown! You'll receive weeds once you harvest.`,
      isHarvestable: true,
    };
  }

  if (blocksGrown >= blocksRequired && waterAbsorbed >= waterRequired) {
    return {
      text: seasonSeedTypes.includes(seedType)
        ? `${toSentenceCase(seedType)} is ripe for harvest!`
        : `${toSentenceCase(seedType)} is ripe but now is not the right season to harvest. You'll get weeds if you do.`,
      isHarvestable: true,
    };
  }

  // still growing

  const conditions = [];
  if (blocksGrown < blocksRequired) {
    conditions.push('still needs time to grow');
  }

  if (waterAbsorbed < waterRequired) {
    conditions.push('needs more water');
  }

  return {
    text: `${toSentenceCase(seedType)} ${conditions.join(' and ')}.`,
    isHarvestable: false,
  };
};

const mapSeedTypeToWaterRequired = (seedType: SeedType) => {
  switch (seedType) {
    case SEED_TYPE.CARROT:
      return parseInt(publicRuntimeConfig.CARROT_MIN_WATER || '0', 10);
    case SEED_TYPE.CORN:
      return parseInt(publicRuntimeConfig.CORN_MIN_WATER || '0', 10);
    case SEED_TYPE.POTATO:
      return parseInt(publicRuntimeConfig.POTATO_MIN_WATER || '0', 10);
    default:
      return 0;
  }
};

const mapSeedTypeToGrowthDuration = (seedType: SeedType) => {
  switch (seedType) {
    case SEED_TYPE.CARROT:
      return parseInt(publicRuntimeConfig.CARROT_GROWTH_DURATION || '0', 10);
    case SEED_TYPE.CORN:
      return parseInt(publicRuntimeConfig.CORN_GROWTH_DURATION || '0', 10);
    case SEED_TYPE.POTATO:
      return parseInt(publicRuntimeConfig.POTATO_GROWTH_DURATION || '0', 10);
    default:
      return 0;
  }
};

interface Props {
  title: string;
  description: string;
  confirmText: string | JSX.Element;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  currentBlock: number;
  plotInfo: PlotInfo;
  seasonSeedTypes: SeedType[];
  waterLevel: number;
}

const HarvestModal: React.FC<Props> = ({
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  currentBlock,
  plotInfo,
  waterLevel,
  seasonSeedTypes,
}) => {
  const [seedType, setSeedType] = useState<SeedType>(plotInfo.seedType as SeedType);
  const [harvestState, setHarvestState] = useState<{ text: string; isHarvestable: boolean }>({
    text: '',
    isHarvestable: false,
  });
  const [waterRequired, setWaterRequired] = useState<number>(0);
  const [blocksGrown, setBlocksGrown] = useState<number>(0);
  const [blocksRequired, setBlockRequired] = useState<number>(0);
  const [plantedOnBlock, setPlantedOnBlock] = useState<number>(0);
  const [blocksTillOvergrown, setBlocksTillOvergrown] = useState<number>(0);
  const [waterAbsorbed, setWaterAbsorbed] = useState<number>(0);

  useEffect(() => {
    if (
      !plotInfo?.seedType ||
      (!plotInfo.waterAbsorbed && plotInfo.waterAbsorbed !== 0) ||
      (!plotInfo.plantedBlockNumber && plotInfo.plantedBlockNumber !== 0) ||
      (!plotInfo.overgrownBlockNumber && plotInfo.overgrownBlockNumber !== 0) ||
      (!currentBlock && currentBlock !== 0)
    ) {
      return;
    }

    setSeedType(plotInfo.seedType as SeedType);
    setWaterAbsorbed(plotInfo.waterAbsorbed);
    setWaterRequired(mapSeedTypeToWaterRequired(plotInfo.seedType as SeedType));
    // the game can lag behind the current block, so we need to make sure the plotsGrown is not negative
    setBlocksGrown(Math.max(currentBlock - plotInfo.plantedBlockNumber, 0));
    setBlockRequired(mapSeedTypeToGrowthDuration(plotInfo.seedType as SeedType));

    setBlocksTillOvergrown(Math.max(plotInfo.overgrownBlockNumber - currentBlock, 0));
    setPlantedOnBlock(plotInfo.plantedBlockNumber);
  }, [
    currentBlock,
    plotInfo?.seedType,
    plotInfo.waterAbsorbed,
    plotInfo.plantedBlockNumber,
    plotInfo.overgrownBlockNumber,
  ]);

  useEffect(() => {
    setHarvestState(
      getHarvestState(
        seedType,
        seasonSeedTypes,
        blocksGrown,
        blocksRequired,
        waterAbsorbed,
        waterRequired,
        blocksTillOvergrown,
      ),
    );
  }, [seedType, seasonSeedTypes, blocksGrown, blocksRequired, waterAbsorbed, waterRequired, blocksTillOvergrown]);

  const confirm = () => onConfirm && onConfirm();
  const cancel = () => onCancel && onCancel();

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-opacity-75 transition-opacity" aria-hidden="true" />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <div className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Plot Info 🟩
                </div>
                <div className="mt-2">
                  <p className="text-gray-500 mt-1">{`Plot water level: ${waterLevel} 🚰`}</p>

                  {seedType && (
                    <p className="text-gray-500 mt-1">
                      <span>Planted:</span>
                      <span className="ml-1 font-semibold">{toSentenceCase(seedType)}</span>
                      <span className="ml-1">{seedTypeToEmoji(seedType)}</span>
                    </p>
                  )}
                  {(waterAbsorbed || waterAbsorbed === 0) && (
                    <p
                      className={`text-gray-500 mt-1 ${!!waterRequired && waterAbsorbed >= waterRequired ? 'animate-pulse bg-green-600 text-white p-1' : ''}`}
                    >
                      {`Plant water absorbed: ${waterAbsorbed}`} {`${waterRequired ? `/ ${waterRequired} 💧` : ' 💧'}`}
                    </p>
                  )}

                  {(blocksGrown || blocksGrown === 0) && (
                    <p
                      className={`text-gray-500 mt-1 ${!!blocksRequired && blocksGrown >= blocksRequired ? 'animate-pulse bg-green-600 text-white p-1' : ''}`}
                    >
                      {`Plant grown: ${blocksGrown}`} {`${blocksRequired ? `/ ${blocksRequired} 🌱` : ' 🌱'}`}
                    </p>
                  )}
                  {plantedOnBlock && <p className="text-gray-500 mt-5">{`Planted on block: ${plantedOnBlock} 📅`}</p>}
                  {(blocksTillOvergrown || blocksTillOvergrown === 0) && (
                    <p
                      className={`text-gray-500 mt-1 ${blocksTillOvergrown === 0 ? 'animate-pulse bg-red-600 text-white p-1' : ''}`}
                    >{`Blocks till overgrown: ${blocksTillOvergrown} 🥀`}</p>
                  )}
                </div>
                <div className="text-lg leading-6 font-medium text-gray-900 mt-5">{title}</div>
                <div className="mt-2">
                  <p className="text-gray-500">
                    <span>{`${description}. `}</span>
                    <span className="underline font-semibold">{harvestState.text}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button onClick={confirm} disabled={!harvestState.isHarvestable}>
              {confirmText}
            </Button>
            {onCancel && <Button onClick={cancel}>{cancelText}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HarvestModal;
