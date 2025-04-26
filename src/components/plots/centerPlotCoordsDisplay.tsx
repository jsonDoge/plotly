import React, { FC } from 'react'

// context
// import { subscribeKey } from 'valtio/utils'
import { centerPlotCoordsStore } from '@/stores/centerPlotCoords'
import { useSnapshot } from 'valtio'
// import { useGame } from '../../context/game'

const CenterPlotCoordsDisplay: FC = () => {
  const centerCoords = useSnapshot(centerPlotCoordsStore)

  return (
    <div className="font-bold text-white">
      <span>{`X: ${centerCoords.coords.x} | `}</span>
      <span>{`Y: ${centerCoords.coords.y}`}</span>
    </div>
  )
}

export default CenterPlotCoordsDisplay
