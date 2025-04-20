import React from 'react';

import Button from './button';
import { SeedType } from '../utils/constants';

interface Props {
  title: string;
  description: string;
  confirmText: string | JSX.Element;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  seedType?: SeedType;
  seasonSeedTypes?: SeedType[];
  waterLevel: number;
  waterAbsorbed?: number;
  waterRequired?: number;
  blocksGrown?: number;
  blocksRequired?: number;
  plantedOnBlock?: number;
  blocksTillOvergrown?: number;
  isButtonDisabled?: boolean;
}

const PlotModal: React.FC<Props> = ({
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  seedType,
  seasonSeedTypes,
  waterLevel,
  waterAbsorbed,
  waterRequired,
  blocksGrown,
  blocksRequired,
  plantedOnBlock,
  blocksTillOvergrown,
  isButtonDisabled,
}) => {
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
                  {seedType && !seasonSeedTypes?.includes(seedType) && "If you harvest now, you'll get weeds..."}
                </div>
                <div className="text-lg leading-6 font-medium text-gray-900 mt-5">{title}</div>
                <div className="mt-2">
                  <p className="text-gray-500">{description}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button onClick={confirm} disabled={!!isButtonDisabled}>
              {confirmText}
            </Button>
            {onCancel && <Button onClick={cancel}>{cancelText}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlotModal;
