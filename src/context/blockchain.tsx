import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { blockchainStoreActions } from '@/stores/blockchain'
import {
  getAccountInfos,
  getFarmId,
  getFarmPlotMintAtaOwnerId,
  getPlotId,
  getPlotMintAtaId,
  getPlotMintId,
} from '@/services/web3Utils'
import { subscribeKey } from 'valtio/utils'
import { Coordinates } from '@/components/game/utils/interfaces'
import { getAllPlotCoordinatesAround } from '@/components/game/utils/plots'
import { PublicKey } from '@solana/web3.js'
import getConfig from 'next/config'
import { useSnapshot } from 'valtio'
import { walletActions, walletStore } from '@/stores/wallet'
import { mappedPlotInfosActions } from '@/stores/mappedPlotInfos'
import { reloadPlotsAtStore } from '@/stores/reloadPlotsAt'
import { useAnchorProvider } from './solana'
import { getFarmProgram } from '@project/anchor'

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
  const provider = useAnchorProvider()

  // Store wallet to valtio
  const wallet = useWallet()

  useMemo(() => {
    if (wallet.publicKey && walletAddress !== wallet.publicKey.toString()) {
      walletActions.setAddress(wallet.publicKey.toString())
    }
  }, [wallet.publicKey])

  // Store current block to valtio

  const loadBlockchainInfo = () => {
    connection.getBlockHeight().then((blockNumber) => {
      console.log(blockNumber)

      // verify if we still need to use context at all
      setCurrentBlock(Number(blockNumber))

      blockchainStoreActions.setCurrentBlock(Number(blockNumber))
    })
  }


  useEffect(() => {
    // keep refreshing the block number
    loadBlockchainInfo()

    const intervalId = setInterval(() => {
      loadBlockchainInfo()
    }, 60000)

    // loads plot data if center plot coordinates change
    const unsubscribeCenterChanged = subscribeKey(
      reloadPlotsAtStore,
      'centerCoords',
      async (centerCoords: Coordinates) => {
        if (!walletAddress) {
          return
        }

        const program = getFarmProgram(provider)

        const allCoords = getAllPlotCoordinatesAround(centerCoords.x, centerCoords.y)

        const allPlotMintIds = allCoords.map((coords) =>
          getPlotMintId(coords.x, coords.y, new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID)),
        )

        const allPlotIds = allPlotMintIds.map(getPlotId);

        // const mint = await getAccountInfos(connection, [allPlotMintIds[24]])
        // if (mint && mint.value && mint.value[0]) {
        //   console.log('🚀 ~ mint:', mint.value[0])
        //   console.log('🚀 ~ mint:', mint.value[0].owner.toString())
        // }
        const rawPlotInfos = await getAccountInfos(connection, [...allPlotIds]) // , ...allUserPlotMintAtas])
        // console.log('🚀 ~ rawPlotInfos:', rawPlotInfos)

        // const half = Math.ceil(ataInfos.value.length / 2)
        // const farmPlotMintAtaInfos = {
        //   value: ataInfos.value.slice(0, half),
        // }
        // const userPlotMintAtaInfos = {
        //   value: ataInfos.value.slice(half),
        // }
        // console.log(program.account)
        const plotAccountType = program?.account?.plot;

        const parsedPlotInfos = rawPlotInfos.value.map((rawPlot: any) => ({
          data: rawPlot?.data ? plotAccountType.coder.accounts.decode('plot', rawPlot?.data) : null,
        }))
        // console.log("🚀 ~ parsedPlotInfos ~ parsedPlotInfos:", parsedPlotInfos)

        // const userRawPlots = userPlotMintAtaInfos.value.map((rawPlot: any) => ({
        //   owner: rawPlot?.owner,
        //   data: rawPlot?.data,
        // }))

        mappedPlotInfosActions.setRawPlots(centerCoords.x, centerCoords.y, parsedPlotInfos)
      },
    )

    return () => {
      unsubscribeCenterChanged()
      clearInterval(intervalId)
    }
  }, [walletAddress])

  const blockchainContextValue = useMemo(() => ({ currentBlock }), [currentBlock])
  // TODO: investigate if such value context doesn't cause performance issues
  return <BlockchainContext.Provider value={blockchainContextValue}> {children} </BlockchainContext.Provider>
}

BlockchainContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default BlockchainContextProvider
export const useBlockchain = () => useContext(BlockchainContext)
