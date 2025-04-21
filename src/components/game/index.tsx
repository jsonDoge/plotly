/* eslint-disable no-param-reassign */
import React, { MutableRefObject, useEffect, useRef } from 'react'
import getConfig from 'next/config'
import { debounce } from 'lodash'
// import { Contract } from 'ethers'
import { useGame } from '../../context/game'
import { getAllPlotCoordinatesAround } from './utils/plots'
import { Coordinates, MappedPlotInfos } from './utils/interfaces'
import { INITIAL_PLOT_CENTER_COORDS } from './utils/constants'
import { generateEmptyMappedPlotInfos, reduceContractPlots } from './utils/mapPlots'
import CanvasWrapper from './canvasWrapper'
import { walletStore, mappedPlotInfosStore } from '../../stores'
import { Wallet } from '../../utils/interfaces'
import { getPlotIdFromCoordinates } from '../../services/utils'
// import { getContract } from '../../services/web3Utils'
import { CONTRACT_TYPE } from '../../utils/constants'
import { useBlockchain } from '../../context/blockchain'

const { publicRuntimeConfig } = getConfig()

// TODO: test why more splitting causes re-renders of parent
// const CanvasWrapper = dynamic(
//   () => import('./game/canvasWrapper'),
//   { suspense: true, ssr: false }
// );

const Game = () => {
  console.info('Rendering game')

  const wallet: MutableRefObject<Wallet | undefined> = useRef()

  const { subscribeToUiActionCompleted, centerChanged } = useGame()
  const { currentBlock } = useBlockchain()
  const plotCenterRef = useRef<Coordinates>(INITIAL_PLOT_CENTER_COORDS)

  const gridPlotCoordinates = getAllPlotCoordinatesAround(INITIAL_PLOT_CENTER_COORDS.x, INITIAL_PLOT_CENTER_COORDS.y)

  // TODO: show errors
  const resetMappedPlotInfos = () => {
    mappedPlotInfosStore.setValue(generateEmptyMappedPlotInfos(gridPlotCoordinates))
  }

  const convertCenterToLowerLeftCorner = (x: number, y: number) => ({
    x: x - 3 < 0 ? 0 : x - 3,
    y: y - 3 < 0 ? 0 : y - 3,
  })

  const loadPlotInfos = async (
    walletAddress: string | undefined,
    currentBlock_: number,
    centerX: number,
    centerY: number,
  ): Promise<MappedPlotInfos | undefined> => {
    if (centerX > 997 || centerY > 997 || centerX < 2 || centerY < 2) {
      return undefined
    }

    const { x: cornerX, y: cornerY } = convertCenterToLowerLeftCorner(centerX, centerY)
    const cornerPlotId = getPlotIdFromCoordinates(cornerX, cornerY)

    let farm: any
    if (publicRuntimeConfig.MOCK_CHAIN_MODE) {
      farm = {
        getPlotView: async (plotId: number) => {
          const plotInfos = generateEmptyMappedPlotInfos(gridPlotCoordinates)
          return plotInfos[plotId]
        },
        getSurroundingWaterLogs: async (plotId: number) => {
          const surroundingWaterLogs = []
          for (let i = 0; i < 7; i += 1) {
            surroundingWaterLogs.push({ id: i, waterLog: 0 })
          }
          return surroundingWaterLogs
        },
      }
    } else {
      // redo in solana
      // farm = getContract(publicRuntimeConfig.C_FARM, CONTRACT_TYPE.FARM, { isSignerRequired: false })
    }

    // getPlotView returns array sorted as x + y * 7
    const contractPlots = await farm.getPlotView(cornerPlotId)
    const surroundingPlotWaterLogs = await farm.getSurroundingWaterLogs(cornerPlotId)

    // TODO: refactor to not fetch same data if coords didn't change
    const res = reduceContractPlots(
      contractPlots,
      surroundingPlotWaterLogs,
      currentBlock_,
      walletAddress || '',
      cornerX,
      cornerY,
    )

    return res
  }

  const debouncedLoadPlotInfos = debounce(
    (...args: Parameters<typeof loadPlotInfos>) => loadPlotInfos(...args).then(mappedPlotInfosStore.setValue),
    2000,
  )

  const reloadPlotInfos = (currentBlock_: number) => {
    resetMappedPlotInfos()
    debouncedLoadPlotInfos(wallet.current?.address, currentBlock_, plotCenterRef.current.x, plotCenterRef.current.y)
    centerChanged(plotCenterRef.current.x, plotCenterRef.current.y)
  }

  useEffect(() => {
    if (!currentBlock) {
      return () => {}
    }

    wallet.current = walletStore.getValue()

    subscribeToUiActionCompleted(() => reloadPlotInfos(currentBlock))

    const cleanUp = walletStore.onChange((newWallet) => {
      if (wallet.current?.address === newWallet?.address) {
        return
      }

      wallet.current = { ...newWallet }
      reloadPlotInfos(currentBlock)
    })

    return () => {
      subscribeToUiActionCompleted(() => {})
      cleanUp()
    }
  }, [currentBlock])

  return <CanvasWrapper plotCenterChanged={() => reloadPlotInfos(currentBlock)} />
}

export default Game
