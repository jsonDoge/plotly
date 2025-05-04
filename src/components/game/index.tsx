/* eslint-disable no-param-reassign */
import React, { MutableRefObject, useEffect, useRef } from 'react'
import getConfig from 'next/config'
import { debounce } from 'lodash'
import { subscribeKey } from 'valtio/utils'
// import { Contract } from 'ethers'
import { subscribe } from 'valtio'
import { PublicKey } from '@solana/web3.js'

// stores

import { mappedPlotInfosActions, mappedPlotInfosStore, RawPlotsAtCenter } from '@/stores/mappedPlotInfos'
import { uiActionCompletedStore } from '@/stores/uiActionCompleted'
import { blockchainStore } from '@/stores/blockchain'
import { teleportStore } from '@/stores/teleport'
import {
  getAccountInfos,
  getFarmId,
  getFarmPlotMintAtaOwnerId,
  getPlotMintAtaId,
  getPlotMintId,
} from '@/services/web3Utils'
import { reloadPlotsAtActions } from '@/stores/reloadPlotsAt'
import { appRouteStore, Route } from '@/stores/appRoute'
import { centerPlotCoordsStore, centerPlotCoordsActions } from '../../stores/centerPlotCoords'
import { walletStore } from '../../stores/wallet'

// components
import CanvasWrapper from './canvasWrapper'

// interfaces
import { Coordinates, MappedPlotInfos, RawPlant, RawPlot } from './utils/interfaces'
import { Wallet } from '../../utils/interfaces'

// utils
import { generateEmptyMappedPlotInfos, reduceProgramPlots } from './utils/mapPlots'
import { getAllPlotCoordinatesAround } from './utils/plots'

// services
import { getPlotIdFromCoordinates } from '../../services/utils'

// import { useGame } from '../../context/game'
import { INITIAL_PLOT_CENTER_COORDS, PLOT_SIZE } from './utils/constants'
// import { walletStore, mappedPlotInfosStore } from '../../stores'
// import { getContract } from '../../services/web3Utils'
// import { CONTRACT_TYPE } from '../../utils/constants'
// import { useBlockchain } from '../../context/blockchain'

const { publicRuntimeConfig } = getConfig()

// TODO: test why more splitting causes re-renders of parent
// const CanvasWrapper = dynamic(
//   () => import('./game/canvasWrapper'),
//   { suspense: true, ssr: false }
// );

const Game = () => {
  console.info('Rendering game')

  const walletAddress: MutableRefObject<string | undefined> = useRef()
  const currentBlock: MutableRefObject<number> = useRef(0)
  const movedAgo: MutableRefObject<number> = useRef(new Date().getTime())

  // const { currentBlock } = useBlockchain()
  // const currentBlock = 0
  // const subscribeToUiActionCompleted = () => {}
  // const centerChanged = () => {}

  // Follows cooradinates 0-999
  const plotCenterRef = useRef<Coordinates>(INITIAL_PLOT_CENTER_COORDS)
  const pauseNavigationRef = useRef<boolean>(false)

  // Absolute camera position in Three.js x/y space
  const centerRef = useRef<Coordinates>({
    x: plotCenterRef.current.x * PLOT_SIZE,
    y: plotCenterRef.current.y * PLOT_SIZE,
  })

  const gridPlotCoordinates = getAllPlotCoordinatesAround(INITIAL_PLOT_CENTER_COORDS.x, INITIAL_PLOT_CENTER_COORDS.y)
  const generateMockProgramPlots = (center: Coordinates) => {
    const allPlots = generateEmptyMappedPlotInfos(getAllPlotCoordinatesAround(center.x, center.y))
    const allPlotsArray = Object.values(allPlots).flatMap((row) => Object.values(row))
    return allPlotsArray
  }

  // TODO: show errors
  const resetMappedPlotInfos = () => {
    mappedPlotInfosActions.setPlotInfos(generateEmptyMappedPlotInfos(gridPlotCoordinates))
    // mappedPlotInfosStore.setValue(generateEmptyMappedPlotInfos(gridPlotCoordinates))
  }

  const convertCenterToLowerLeftCorner = (x: number, y: number) => ({
    x: x - 3 < 0 ? 0 : x - 3,
    y: y - 3 < 0 ? 0 : y - 3,
  })

  // should NOT load without wallet
  const loadPlotInfos = async (
    rawPlots: RawPlot[],
    rawPlants: RawPlant[],
    outerRawPlots: RawPlot[],
    walletAddress_: PublicKey,
    currentBlock_: number,
    centerX: number,
    centerY: number,
  ): Promise<MappedPlotInfos | undefined> => {
    if (centerX > 997 || centerY > 997 || centerX < 2 || centerY < 2) {
      return undefined
    }

    const { x: cornerX, y: cornerY } = convertCenterToLowerLeftCorner(centerX, centerY)

    // TODO: refactor to not fetch same data if coords didn't change

    mappedPlotInfosActions.setPlotInfos(
      reduceProgramPlots(rawPlots, rawPlants, outerRawPlots, currentBlock_, walletAddress_, cornerX, cornerY),
    )
  }

  const debouncedLoadPlotInfos = debounce(
    // triggers blockchain.ts -> to reload plots
    (...args: Parameters<typeof reloadPlotsAtActions.reloadAtCenter>) => {
      reloadPlotsAtActions.reloadAtCenter(...args)
      movedAgo.current = new Date().getTime()
    },
    2000,
  )

  const reloadPlotInfos = (currentBlock_: number) => {
    console.log('reloadPlotInfos', currentBlock_)
    if (currentBlock_ === 0) {
      return
    }
    movedAgo.current = new Date().getTime()
    resetMappedPlotInfos()
    debouncedLoadPlotInfos(plotCenterRef.current.x, plotCenterRef.current.y)
    // centerPlotCoordsActions.setCenterPlotCoords(plotCenterRef.current.x, plotCenterRef.current.y)
  }

  useEffect(() => {
    console.log('== game useEffect block==', currentBlock)

    // reloads every 5 seconds or 5 seconds after last move (may vary due to checking only every 5 seconds)
    const intervalId = setInterval(() => {
      if (currentBlock.current === 0 || new Date().getTime() - movedAgo.current < 5000) {
        return
      }
      reloadPlotsAtActions.reloadAtCenter(plotCenterRef.current.x, plotCenterRef.current.y)
    }, 5000)

    const usubscribeBlockchain = subscribeKey(blockchainStore, 'currentBlock', (currentBlock_: number) => {
      if (currentBlock_ === currentBlock.current) {
        return
      }

      const isFirstLoad = currentBlock.current === 0
      currentBlock.current = currentBlock_

      console.log('game block subscription', currentBlock.current)
      if (isFirstLoad) {
        reloadPlotInfos(currentBlock.current)
      }
    })

    const unsubscribeWallet = subscribeKey(walletStore, 'address', (newAddress: string) => {
      if (!newAddress) {
        return
      }

      if (newAddress === walletAddress.current) {
        return
      }

      walletAddress.current = newAddress

      reloadPlotInfos(currentBlock.current)
    })

    const unsubscribeCenterChanged = subscribeKey(centerPlotCoordsStore, 'coords', (newCoords: Coordinates) => {
      console.log('game center changed', newCoords)
      if (newCoords.x === plotCenterRef.current.x && newCoords.y === plotCenterRef.current.y) {
        return
      }

      console.log('game center changed ACCEPTED')

      plotCenterRef.current = newCoords

      reloadPlotInfos(currentBlock.current)
    })

    const unsubscribeTeleport = subscribeKey(teleportStore, 'coords', (newCoords: Coordinates) => {
      console.log('teleported', newCoords)
      if (newCoords.x === plotCenterRef.current.x && newCoords.y === plotCenterRef.current.y) {
        return
      }

      console.log('teleport changed ACCEPTED')

      centerRef.current = {
        x: newCoords.x * PLOT_SIZE,
        y: newCoords.y * PLOT_SIZE,
      }

      // this tirggers center plot changed in centerPlotCoordsStore -> which in turn triggers reloadPlotInfos
      centerPlotCoordsActions.setCenterPlotCoords(newCoords.x, newCoords.y)
    })

    const unsubscribeUiActionCompleted = subscribe(uiActionCompletedStore, () => {
      reloadPlotInfos(currentBlock.current)
    })

    const unsubscribeMappedPlotInfos = subscribeKey(
      mappedPlotInfosStore,
      'rawPlotsAtCenter',
      async (rawPlotsAtCenter: RawPlotsAtCenter) => {
        console.log('new mapped plot infos received in game/index')
        if (walletAddress.current === undefined) {
          return
        }

        loadPlotInfos(
          rawPlotsAtCenter.rawPlots,
          rawPlotsAtCenter.rawPlants,
          rawPlotsAtCenter.outerRawPlots,
          new PublicKey(walletAddress.current),
          currentBlock.current,
          rawPlotsAtCenter.centerX,
          rawPlotsAtCenter.centerY,
        )
      },
    )

    const unsubscribeAppRoute = subscribeKey(appRouteStore, 'route', (route: Route) => {
      pauseNavigationRef.current = route !== Route.plots
    })

    return () => {
      unsubscribeWallet()
      unsubscribeCenterChanged()
      unsubscribeUiActionCompleted()
      usubscribeBlockchain()
      unsubscribeTeleport()
      unsubscribeMappedPlotInfos()
      unsubscribeAppRoute()
      clearInterval(intervalId)
    }
  }, [])

  return (
    <CanvasWrapper
      pauseNavigationRef={pauseNavigationRef}
      plotCenterRef={plotCenterRef}
      centerRef={centerRef}
      plotCenterChanged={(newX: number, newY: number) => {
        centerPlotCoordsActions.setCenterPlotCoords(newX, newY)
        reloadPlotInfos(currentBlock.current)
      }}
    />
  )
}

export default Game
