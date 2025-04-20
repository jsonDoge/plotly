/* eslint-disable no-param-reassign */
import React, { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import dynamic from 'next/dynamic'
import Camera from './camera'
import CenterControl from './centerControl'
import { useGame } from '../../context/game'
import { Coordinates } from './utils/interfaces'
import { INITIAL_PLOT_CENTER_COORDS } from './utils/constants'

const Grid = dynamic(() => import('./grid'), { suspense: true, ssr: false })

interface Props {
  plotCenterChanged: () => void
}

const CanvasWrapper: React.FC<Props> = ({ plotCenterChanged }) => {
  console.info('Rendering canvasWrapper')

  const { centerRef } = useGame()
  const plotCenterRef = useRef<Coordinates>(INITIAL_PLOT_CENTER_COORDS)

  return (
    <Canvas shadows className="min-h-screen w-screen">
      <CenterControl centerRef={centerRef} plotCenterRef={plotCenterRef} plotCenterChanged={plotCenterChanged} />
      <Camera centerRef={centerRef} />
      <Grid plotCenterRef={plotCenterRef} />
    </Canvas>
  )
}

export default CanvasWrapper
