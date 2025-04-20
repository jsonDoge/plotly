/* eslint-disable no-param-reassign */
import React, { useEffect, useState } from 'react'
import getConfig from 'next/config'

// components
import { buyPlot, harvest, plant } from '../services/farm'
import PlantModal from './plantModal'
import Spinner from './spinner'
import PlotModal from './plotModal'

// context
import { useWallet } from '../context/wallet'
import { useGame } from '../context/game'
import { useBlockchain } from '../context/blockchain'
import { useError } from '../context/error'
import { selectPlotStore } from '../stores'

// interfaces
import { Coordinates, PlotInfo } from './game/utils/interfaces'

// constants
import { SEED_TYPE, SeedType } from '../utils/constants'
import { calculateSeason, getSeasonSeedTypes } from './game/utils/seasons'
import HarvestModal from './harvestModal'
import { getEmptyPlotInfo } from './game/utils/mapPlots'

const { publicRuntimeConfig } = getConfig()

const PlotActionModals: React.FC = () => {
  const { wallet } = useWallet()
  const { currentBlock } = useBlockchain()
  const { uiActionCompleted } = useGame()
  const { setError } = useError()

  // TODO: show errors
  const [isLoading, setIsLoading] = useState(false)

  // modals
  const [isAlreadyOwnedModalShown, setIsAlreadyOwnedModalShown] = useState(false)
  const [isBuyPlotModalShown, setIsBuyPlotModalShown] = useState(false)
  const [isPlantModalShown, setIsPlantModalShown] = useState(false)
  const [isHarvestModalShown, setIsHarvestModalShown] = useState(false)
  const [seasonSeedTypes, setSeasonSeedTypes] = useState<SeedType[]>([])
  const [waterLevel, setWaterLevel] = useState(0)
  const [selectedCoords, setSelectedCoords] = useState<Coordinates>()
  const [currentPlotInfo, setCurrentPlotInfo] = useState<PlotInfo>(getEmptyPlotInfo())

  const onPlotSelect = (x: number, y: number, plotInfo: PlotInfo, currentBlock_: number) => {
    setSelectedCoords({ x, y })
    setWaterLevel(plotInfo.waterLevel)

    setSeasonSeedTypes(
      getSeasonSeedTypes(calculateSeason(currentBlock_, parseInt(publicRuntimeConfig.SEASON_DURATION_BLOCKS, 10))),
    )

    const { isUnminted, isPlantOwner, isOwner } = plotInfo

    if (isUnminted) {
      setIsBuyPlotModalShown(true)
      return
    }

    if (isOwner && !isPlantOwner) {
      setIsPlantModalShown(true)
      return
    }

    if (isPlantOwner) {
      setIsHarvestModalShown(true)
      return
    }

    // only condition left is either !isUnminted && !isOwner && !isPlantOwner
    setIsAlreadyOwnedModalShown(true)
  }

  const hideModal = () => {
    setIsBuyPlotModalShown(false)
    setIsPlantModalShown(false)
    setIsHarvestModalShown(false)
    setIsAlreadyOwnedModalShown(false)
  }

  const onModalConfirm = async (
    fn: (walletPrivateKey: string) => Promise<any>,
    onFinish: () => void,
    errorMessage: string,
  ) => {
    setError('')
    if (!wallet?.privateKey) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }
    setIsLoading(true)
    try {
      await fn(wallet.privateKey)
    } catch (e) {
      console.error(e)
      setIsLoading(false)
      onFinish()
      setError(errorMessage)
      return
    }
    setIsLoading(false)
    onFinish()
    uiActionCompleted()
  }

  const defaultBuyErrorMessage = 'Buy failed, check if you have enough USDT funds'
  const onBuyPlotConfirm = async (coords: Coordinates) =>
    onModalConfirm(
      (walletPrivateKey: string) => buyPlot(coords.x, coords.y, walletPrivateKey),
      () => setIsBuyPlotModalShown(false),
      defaultBuyErrorMessage,
    )

  const defaultPlantErrorMessage = 'Planting failed, check if you have necessary seed'
  const onPlantConfirm = async (coords: Coordinates, seedType_: string) =>
    onModalConfirm(
      (walletPrivateKey: string) => plant(coords.x, coords.y, seedType_, walletPrivateKey),
      () => setIsPlantModalShown(false),
      defaultPlantErrorMessage,
    )

  const defaultHarvestErrorMessage = 'Harvest failed :('
  const onHarvestConfirm = async (coords: Coordinates) =>
    onModalConfirm(
      (walletPrivateKey: string) => harvest(coords.x, coords.y, walletPrivateKey),
      () => setIsHarvestModalShown(false),
      defaultHarvestErrorMessage,
    )

  useEffect(
    () =>
      selectPlotStore.onChange(({ x, y, plotInfo }) => {
        setCurrentPlotInfo(plotInfo)
        onPlotSelect(x, y, plotInfo, currentBlock)
      }),
    [currentBlock],
  )

  return (
    <>
      {/* TODO: probably a good idea to create separate modals for each action - split into self-contained components */}
      {isAlreadyOwnedModalShown && (
        <PlotModal
          title="This plot is owned by another farmer 🛑"
          description="Better luck next time"
          confirmText="Okay"
          onConfirm={() => hideModal()}
          waterLevel={waterLevel}
        />
      )}
      {isBuyPlotModalShown && selectedCoords && (
        <PlotModal
          title="Buy land plot? 💸"
          description={`You are about to buy plot located at [X : ${selectedCoords.x} | Y : ${selectedCoords.y}]`}
          confirmText={isLoading ? <Spinner /> : 'Buy'}
          cancelText="Cancel"
          onConfirm={() => onBuyPlotConfirm(selectedCoords)}
          onCancel={() => hideModal()}
          waterLevel={waterLevel}
        />
      )}
      {isPlantModalShown && selectedCoords && (
        <PlantModal
          title="Plant seed? 🌱"
          seedTypes={Object.values(SEED_TYPE)}
          seasonSeedTypes={seasonSeedTypes}
          description={`You are about to plant at [X : ${selectedCoords.x} | Y : ${selectedCoords.y}]`}
          confirmText={isLoading ? <Spinner /> : 'Plant'}
          cancelText="Regret forever"
          onConfirm={(seedType_) => onPlantConfirm(selectedCoords, seedType_)}
          onCancel={() => hideModal()}
          waterLevel={waterLevel}
        />
      )}
      {isHarvestModalShown && selectedCoords && (
        <HarvestModal
          title="Harvest? 👨‍🌾"
          description={`You are about to harvest at [X : ${selectedCoords.x} | Y : ${selectedCoords.y}]`}
          confirmText={isLoading ? <Spinner /> : 'Harvest'}
          cancelText="Cancel"
          onConfirm={() => onHarvestConfirm(selectedCoords)}
          onCancel={() => hideModal()}
          currentBlock={currentBlock}
          plotInfo={currentPlotInfo}
          seasonSeedTypes={seasonSeedTypes}
          waterLevel={waterLevel}
          // TODO: Should really move this logic to it's own component... Too many checks if variables are defined
        />
      )}
    </>
  )
}

export default PlotActionModals
