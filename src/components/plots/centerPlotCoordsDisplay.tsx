import React, { FC, useState } from 'react';

// context
import { useGame } from '../../context/game';

const CenterPlotCoordsDisplay: FC = () => {
  const { subscribeToCenterChanged } = useGame();
  const [centerPlot, setCenterPlot] = useState({ x: 0, y: 0 });

  subscribeToCenterChanged((x, y) => {
    setCenterPlot({ x, y });
  });

  return (
    <div className="font-bold text-white">
      <span>{`X: ${centerPlot.x} | `}</span>
      <span>{`Y: ${centerPlot.y}`}</span>
    </div>
  );
};

export default CenterPlotCoordsDisplay;
