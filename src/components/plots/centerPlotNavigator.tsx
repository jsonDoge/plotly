import React, { useState } from 'react';
import { useGame } from '../../context/game';
import { useError } from '../../context/error';
import Input from '../input';
import Button from '../button';
import { PLOT_CENTER_AREA_LIMIT } from '../game/utils/constants';

interface Props {
  isMobile?: boolean;
}

const CenterPlotNavigator: React.FC<Props> = ({ isMobile = false }) => {
  const { submitNewPlotCenter, centerChanged } = useGame();
  const { error, setError } = useError();

  const [centerX, setCenterX] = useState(3);
  const [centerY, setCenterY] = useState(3);

  const validateInput = (input: number) => {
    if (!input && input !== 0) {
      setError('Invalid center');
      return false;
    }
    if (input > PLOT_CENTER_AREA_LIMIT.x1 || input < PLOT_CENTER_AREA_LIMIT.x0) {
      setError('Center exceeds limits [3, 996]');
      return false;
    }

    return true;
  };

  return (
    <div>
      <div>
        {error && (
          <div>
            <span className="text-red-500 bg-black bg-opacity-50">{error}</span>
            <button className="ml-3 px-3 pb-1 bg-red-500 text-white rounded" type="submit" onClick={() => setError('')}>
              x
            </button>
          </div>
        )}
      </div>
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center gap-3 mt-2 rounded-sm`}>
        <div className="flex flex-row items-center justify-center gap-2">
          <div>
            <label className="block text-white text-sm font-bold" htmlFor="coordinateX">
              X
            </label>
          </div>
          <Input
            id="coordinateX"
            name="coordinateX"
            type="number"
            value={centerX}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setCenterX(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="flex flex-row items-center justify-center gap-2">
          <label className="block text-white text-sm font-bold" htmlFor="coordinateY">
            Y
          </label>
          <Input
            id="coordinateY"
            name="coordinateY"
            type="number"
            value={centerY}
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setCenterY(parseInt(e.target.value, 10))}
          />
        </div>
        <div>
          <Button
            onClick={() => {
              const isValidX = validateInput(centerX);
              if (!isValidX) {
                return;
              }

              const isValidY = validateInput(centerY);
              if (!isValidY) {
                return;
              }

              setError('');
              submitNewPlotCenter(centerX, centerY);
              centerChanged(centerX, centerY);
            }}
          >
            Load
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CenterPlotNavigator;
