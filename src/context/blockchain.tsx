import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useConnection } from '@solana/wallet-adapter-react'
import { blockchainStoreActions } from '@/stores/blockchain'
import {
  getAccountInfos,
  getFarmId,
  getFarmPlotMintAtaOwnerId,
  getPlotMintAtaId,
  getPlotMintId,
} from '@/services/web3Utils'
import { subscribeKey } from 'valtio/utils'
import { Coordinates } from '@/components/game/utils/interfaces'
import { getAllPlotCoordinatesAround } from '@/components/game/utils/plots'
import { PublicKey } from '@solana/web3.js'
import getConfig from 'next/config'
import { useSnapshot } from 'valtio'
import { walletStore } from '@/stores/wallet'
import { mappedPlotInfosActions } from '@/stores/mappedPlotInfos'
import { reloadPlotsAtStore } from '@/stores/reloadPlotsAt'

const { publicRuntimeConfig } = getConfig()

interface IBlockchainContext {
  currentBlock: number
}

// Currently subscription only supports one subscriber per event
const BlockchainContext = createContext<IBlockchainContext>({
  currentBlock: 0,
})

const BlockchainContextProvider = ({ children }: { children: React.ReactNode }) => {
  const walletAddress = useSnapshot(walletStore).address
  const [currentBlock, setCurrentBlock] = useState<number>(0)
  const { connection } = useConnection()

  const loadBlockchainInfo = () => {
    connection.getBlockHeight().then((blockNumber) => {
      console.log(blockNumber)

      // verify if we still need to use context at all
      setCurrentBlock(Number(blockNumber))

      blockchainStoreActions.setCurrentBlock(Number(blockNumber))
    })
  }

  useEffect(() => {
    loadBlockchainInfo()

    const intervalId = setInterval(() => {
      loadBlockchainInfo()
    }, 60000)

    // loads plot data if center plot coordinates change
    const unsubscribeCenterChanged = subscribeKey(
      reloadPlotsAtStore,
      'centerCoords',
      async (centerCoords: Coordinates) => {
        const allCoords = getAllPlotCoordinatesAround(centerCoords.x, centerCoords.y)

        const allPlotMintIds = allCoords.map((coords) =>
          getPlotMintId(coords.x, coords.y, new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID)),
        )

        console.log('allPlotMintIds', allPlotMintIds)

        const farmId = getFarmId(new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID))
        const farmPlotMintAtaOwnerId = getFarmPlotMintAtaOwnerId(farmId)

        const allFarmPlotMintAtas = allPlotMintIds.map((plotMintId) =>
          getPlotMintAtaId(plotMintId, farmPlotMintAtaOwnerId),
        )

        const allUserPlotMintAtas = allPlotMintIds.map((plotMintId) =>
          getPlotMintAtaId(plotMintId, new PublicKey(walletAddress)),
        )

        console.log(
          'allFarmPlotMintAtas',
          allFarmPlotMintAtas.map((x) => x.toString()),
        )

        const ataInfos = await getAccountInfos(connection, [...allFarmPlotMintAtas, ...allUserPlotMintAtas])

        const half = Math.ceil(ataInfos.value.length / 2)
        const farmPlotMintAtaInfos = {
          value: ataInfos.value.slice(0, half),
        }
        const userPlotMintAtaInfos = {
          value: ataInfos.value.slice(half),
        }

        const farmRawPlots = farmPlotMintAtaInfos.value.map((rawPlot: any) => ({
          owner: rawPlot?.owner,
          data: rawPlot?.data,
        }))

        const userRawPlots = userPlotMintAtaInfos.value.map((rawPlot: any) => ({
          owner: rawPlot?.owner,
          data: rawPlot?.data,
        }))

        mappedPlotInfosActions.setRawPlots(centerCoords.x, centerCoords.y, farmRawPlots, userRawPlots)
      },
    )

    return () => {
      unsubscribeCenterChanged()
    }

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const blockchainContextValue = useMemo(() => ({ currentBlock }), [currentBlock])
  // TODO: investigate if such value context doesn't cause performance issues
  return <BlockchainContext.Provider value={blockchainContextValue}> {children} </BlockchainContext.Provider>
}

BlockchainContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default BlockchainContextProvider
export const useBlockchain = () => useContext(BlockchainContext)
