import React, { FC } from 'react'

import { centerPlotCoordsStore } from '@/stores/centerPlotCoords'
import { useSnapshot } from 'valtio'

const CenterPlotCoordsDisplay: FC = () => {
  const centerCoords = useSnapshot(centerPlotCoordsStore)

  return (
    <div className="font-bold text-white">
      <span>Center </span>
      <span>{`X: ${centerCoords.coords.x} | `}</span>
      <span>{`Y: ${centerCoords.coords.y}`}</span>
    </div>
  )
}

export default CenterPlotCoordsDisplay
