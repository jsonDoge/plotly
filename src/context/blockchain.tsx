import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { blockchainStoreActions } from '@/stores/blockchain'
import {
  getAccountInfos,
  getFarmId,
  getFarmPlotMintAtaOwnerId,
  getPlantId,
  getPlotId,
  getPlotMintAtaId,
  getPlotMintId,
} from '@/services/web3Utils'
import { subscribeKey } from 'valtio/utils'
import { Coordinates } from '@/components/game/utils/interfaces'
import { getAllPlotCoordinatesAround, getOuterBorderPlotCoordinatesAround } from '@/components/game/utils/plots'
import { PublicKey } from '@solana/web3.js'
import getConfig from 'next/config'
import { useSnapshot } from 'valtio'
import { walletActions, walletStore } from '@/stores/wallet'
import { mappedPlotInfosActions } from '@/stores/mappedPlotInfos'
import { reloadPlotsAtStore } from '@/stores/reloadPlotsAt'
import { getFarmProgram } from '@project/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from 'bn.js'
import { useAnchorProvider } from './solana'

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
      // wallet changed
      walletActions.setAddress(wallet.publicKey.toString())
      walletActions.loadOwnedSeed()
    }
  }, [wallet.publicKey])

  // Store current block to valtio

  const loadBlockchainInfo = () => {
    connection.getSlot().then((blockNumber) => {
      console.log(blockNumber)

      // verify if we still need to use context at all
      setCurrentBlock(Number(blockNumber))

      blockchainStoreActions.setCurrentBlock(Number(blockNumber))
    })
  }

  const loadBalance = async (walletAddr: PublicKey) => {
    const [ataAddr] = PublicKey.findProgramAddressSync(
      [
        walletAddr.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID).toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    let balance = new BN(0)
    try {
      const ataInfo = await connection.getTokenAccountBalance(ataAddr)
      console.log('🚀 ~ loadBalance ~ info:', ataInfo)

      balance = new BN(ataInfo.value.amount)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }

    if (!balance.eq(new BN(0))) {
      walletActions.setBalance(balance)
    }
  }

  useEffect(() => {
    // keep refreshing the block number
    loadBlockchainInfo()
    if (walletAddress) {
      loadBalance(new PublicKey(walletAddress))
    }

    const blockIntervalId = setInterval(() => {
      loadBlockchainInfo()
    }, 60000)

    const balanceIntervalId = setInterval(() => {
      if (walletAddress) {
        loadBalance(new PublicKey(walletAddress))
      }
    }, 10000)

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
        // 28 plots outside of each border, needed for main plot water calculations
        const allOuterCoords = getOuterBorderPlotCoordinatesAround(centerCoords.x, centerCoords.y)

        const allPlotMintIds = allCoords.map((coords) =>
          getPlotMintId(coords.x, coords.y, new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID)),
        )

        const allOuterPlotMintIds = allOuterCoords
          .filter((i) => i)
          .map((coords) => getPlotMintId(coords.x, coords.y, new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID)))

        const allOuterPlotIds = allOuterPlotMintIds.map(getPlotId)
        const allPlotIds = allPlotMintIds.map(getPlotId)

        const rawPlotInfos = await getAccountInfos(connection, [...allPlotIds, ...allOuterPlotIds]) // , ...allUserPlotMintAtas])

        const plotAccountType = program?.account?.plot
        const plantAccountType = program?.account?.plant

        const parsedPlotInfos = rawPlotInfos.value.map((rawPlot: any) => ({
          data: rawPlot?.data ? plotAccountType.coder.accounts.decode('plot', rawPlot?.data) : null,
        }))

        // we analyze plot infos to see which plots could have plants and only get info for those

        // slice, because we only look for plants on the main plots (not outer)
        const plotMintIdsThatCouldHavePlants = parsedPlotInfos.slice(0, 49).map((plotInfo: any, i: number) => {
          if (!plotInfo.data) {
            return null
          }

          const { data } = plotInfo

          if (
            !data?.lastClaimer ||
            data?.lastClaimer === new PublicKey(publicRuntimeConfig.FARM_AUTH_ID) ||
            data?.lastClaimer === PublicKey.default
          ) {
            return null
          }

          return allPlotMintIds[i]
        })

        const allPlantIds = plotMintIdsThatCouldHavePlants
          .filter((i) => !!i)
          .map((plotMintId) => getPlantId(plotMintId))

        const rawPlantInfos = await getAccountInfos(connection, [...allPlantIds])

        // we fill nulls in between to match the order of plotInfos

        let plantIndex = 0
        const rawPlantInfosWithNulls = plotMintIdsThatCouldHavePlants.map((_, i) => {
          if (plotMintIdsThatCouldHavePlants[i]) {
            return rawPlantInfos.value[plantIndex++]
          }
          return null
        })

        const parsedPlantInfos = rawPlantInfosWithNulls.map((rawPlant: any) => ({
          data: rawPlant?.data ? plantAccountType.coder.accounts.decode('plant', rawPlant?.data) : null,
        }))

        // outer border are in order (-Y, +Y, -X, +X)

        let parsedPlotInfosIndex = 49
        let outerPlotInfosWithNulls: any[] = []
        if (centerCoords.y === 0) {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(new Array(7).fill(null))
        } else {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(
            parsedPlotInfos.slice(parsedPlotInfosIndex, parsedPlotInfosIndex + 7),
          )
          parsedPlotInfosIndex += 7
        }

        if (centerCoords.y === 999) {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(new Array(7).fill(null))
        } else {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(
            parsedPlotInfos.slice(parsedPlotInfosIndex, parsedPlotInfosIndex + 7),
          )
          parsedPlotInfosIndex += 7
        }

        if (centerCoords.x === 0) {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(new Array(7).fill(null))
        } else {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(
            parsedPlotInfos.slice(parsedPlotInfosIndex, parsedPlotInfosIndex + 7),
          )
          parsedPlotInfosIndex += 7
        }
        if (centerCoords.x === 999) {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(new Array(7).fill(null))
        } else {
          outerPlotInfosWithNulls = outerPlotInfosWithNulls.concat(
            parsedPlotInfos.slice(parsedPlotInfosIndex, parsedPlotInfosIndex + 7),
          )
          parsedPlotInfosIndex += 7
        }

        mappedPlotInfosActions.setRawPlotsAndPlants(
          centerCoords.x,
          centerCoords.y,
          parsedPlotInfos.slice(0, 49), // main
          parsedPlantInfos,
          outerPlotInfosWithNulls, // outer
        )
      },
    )

    return () => {
      unsubscribeCenterChanged()
      clearInterval(blockIntervalId)
      clearInterval(balanceIntervalId)
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
