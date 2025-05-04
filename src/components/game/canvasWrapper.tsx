/* eslint-disable no-param-reassign */
import React, { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
// import dynamic from 'next/dynamic'
import Camera from './camera'
import CenterControl from './centerControl'
// import { useGame } from '../../context/game'
import { Coordinates } from './utils/interfaces'
import { INITIAL_PLOT_CENTER_COORDS, PLOT_SIZE } from './utils/constants'
import Grid from './grid'

// const Grid = dynamic(() => import('./grid'), { suspense: true, ssr: false })

interface Props {
  plotCenterChanged: (x: number, y: number) => void
  plotCenterRef: React.MutableRefObject<{ x: number; y: number }>
  centerRef: React.MutableRefObject<{ x: number; y: number }>
  pauseNavigationRef: React.MutableRefObject<boolean>
}

const CanvasWrapper: React.FC<Props> = ({ plotCenterChanged, plotCenterRef, centerRef, pauseNavigationRef }) => {
  console.info('Rendering canvasWrapper')

  // const { centerRef } = useGame()
  // const centerRef = useRef({
  //   x: plotCenterRef.current.x * PLOT_SIZE,
  //   y: plotCenterRef.current.y * PLOT_SIZE,
  // })
  // const plotCenterRef = useRef<Coordinates>(INITIAL_PLOT_CENTER_COORDS)

  return (
    <Canvas shadows className="min-h-screen w-screen">
      {/* center control CHANGES centerRef */}
      <CenterControl
        pauseNavigationRef={pauseNavigationRef}
        centerRef={centerRef}
        initialPlotCenter={plotCenterRef.current}
        plotCenterChanged={plotCenterChanged}
      />
      {/* camera doesn't change centerRef */}
      <Camera centerRef={centerRef} />
      <Grid plotCenterRef={plotCenterRef} />
    </Canvas>
    // <div> </div>
  )
}

export default CanvasWrapper
