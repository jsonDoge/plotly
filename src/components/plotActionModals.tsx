/* eslint-disable no-param-reassign */
import React, { useEffect, useState } from 'react'
import getConfig from 'next/config'
import { useWallet } from '@solana/wallet-adapter-react'

// components

import { subscribeKey } from 'valtio/utils'
import {
  buyPlotTx,
  depositToPlotTx,
  getSurroundingPlotMintIxs,
  harvestPlantTx,
  plantSeedTx,
  returnPlotTx,
  revertPlantTx,
  revokePlotTx,
  tendPlantTx,
} from '@/services/farm'
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { AnchorProvider } from '@coral-xyz/anchor'
import { useAnchorProvider } from '@/context/solana'
import { appRouteStoreActions, Route } from '@/stores/appRoute'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { isValidPublicKey } from '@/services/utils'
import { BN } from 'bn.js'
import { getFarmProgram } from '@project/anchor'
import Spinner from './utils/spinner'
import PlotModal from './plotActionModals/plotModal'

// context
// import { useWallet } from '../context/wallet'
import { useBlockchain } from '../context/blockchain'
import { SelectedPlot, selectedPlotStore } from '../stores/selectedPlot'

// interfaces
import { Coordinates, PlotInfo } from './game/utils/interfaces'

// constants
import { getEmptyPlotInfo } from './game/utils/mapPlots'
import OwnedPlotModal from './plotActionModals/ownedPlotModal'
import OwnedPlantedModal from './plotActionModals/ownedPlantedModal'
import NonOwnedPlotModal from './plotActionModals/nonOwnedPlotModal'

const { publicRuntimeConfig } = getConfig()

const PlotActionModals: React.FC = () => {
  const wallet = useWallet()
  const provider = useAnchorProvider()

  const { currentBlock } = useBlockchain()

  // TODO: show errors
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // modals
  const [isBuyPlotModalShown, setIsBuyPlotModalShown] = useState(false)
  const [isSurroundingPlotModalShown, setSurroundingPlotModalShown] = useState(false)
  const [surroundingPlotMintIxs, setSurroundingPlotMintIxs] = useState<TransactionInstruction[]>([])
  const [isOwnedPlotModalShown, setIsOwnedPlotModalShown] = useState(false)
  const [isOwnedPlantedModalShown, setIsOwnedPlantedModalShown] = useState(false)
  const [isNonOwnedModalShown, setIsNonOwnedModalShown] = useState(false)

  // Selected plot properites
  const [waterLevel, setWaterLevel] = useState(0)

  //
  const [selectedPlotInfo, setSelectedPlotInfo] = useState<PlotInfo>(getEmptyPlotInfo())
  const [selectedCoords, setSelectedCoords] = useState<Coordinates>()

  const onPlotSelect = (x: number, y: number, plotInfo: PlotInfo, currentBlock_: number) => {
    setSelectedPlotInfo(plotInfo)

    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    setSelectedCoords({ x, y })

    setWaterLevel(plotInfo.waterLevel)

    const { isUnminted, isFarmOwner, isPlantOwner, isOwner } = plotInfo

    if (isUnminted || isFarmOwner) {
      setIsLoading(true)
      getSurroundingPlotMintIxs(
        wallet.publicKey,
        provider,
        x,
        y,
        new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
      ).then((instructions) => {
        appRouteStoreActions.setCurrentRoute(Route.modalShown)

        console.log('Finished loading surrounding instructions')
        setIsLoading(false)

        console.log('surrounding instructions', instructions.length)

        if (instructions.length > 0) {
          setSurroundingPlotMintIxs(instructions)
          setSurroundingPlotModalShown(true)
        } else {
          setIsBuyPlotModalShown(true)
        }
      })
      return
    }

    if (isOwner && !!plotInfo.plant) {
      console.log('choosing wrong mondal', plotInfo.plant)
      setIsOwnedPlantedModalShown(true)
      appRouteStoreActions.setCurrentRoute(Route.modalShown)
      return
    }

    // change to is planted?
    if (isOwner) {
      setIsOwnedPlotModalShown(true)
      appRouteStoreActions.setCurrentRoute(Route.modalShown)
      return
    }

    if (!isOwner) {
      setIsNonOwnedModalShown(true)
      appRouteStoreActions.setCurrentRoute(Route.modalShown)
    }

    //   if (isPlantOwner) {
    //     setIsHarvestModalShown(true)
    //     return
    //   }

    //   // only condition left is either !isUnminted && !isOwner && !isPlantOwner
    //   setIsAlreadyOwnedModalShown(true)
  }

  const hideModal = () => {
    setIsBuyPlotModalShown(false)
    setSurroundingPlotModalShown(false)
    setIsOwnedPlotModalShown(false)
    setIsOwnedPlantedModalShown(false)
    setIsNonOwnedModalShown(false)
    setError('')
    setMessage('')
    appRouteStoreActions.setCurrentRoute(Route.plots)

    // setIsPlantModalShown(false)
    // setIsHarvestModalShown(false)
    // setIsAlreadyOwnedModalShown(false)
  }

  const onModalConfirm = async (getTx: () => Promise<Transaction>, onFinish: () => void, errorMessage: string) => {
    setError('')
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }
    setIsLoading(true)
    try {
      // execute transaction
      const tx = await getTx()

      tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
      console.log('tx.recentBlockhash', tx.recentBlockhash)
      // we verify above that the wallet is connected
      tx.feePayer = wallet.publicKey
      const signedTx = await wallet?.signTransaction(tx)
      const rawTransaction = signedTx.serialize()
      await provider.connection.sendRawTransaction(rawTransaction)
      console.log('Transaction sent')
    } catch (e) {
      console.error(e)
      setIsLoading(false)
      setError(errorMessage)
      return
    }
    setIsLoading(false)
    onFinish()
    appRouteStoreActions.setCurrentRoute(Route.plots)
  }

  const defaultBuyErrorMessage = `Buy failed, check if you have enough farm tokens: ${publicRuntimeConfig.PLOT_CURRENCY_MINT_ID}`
  const onBuyPlotConfirm = async (user_: PublicKey | null, provider_: AnchorProvider, coords_: Coordinates) => {
    if (!user_ || !provider_) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    onModalConfirm(
      () => buyPlotTx(user_, provider_, coords_.x, coords_.y, new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID)),
      () => {
        setIsBuyPlotModalShown(false)
      },
      defaultBuyErrorMessage,
    )
  }

  const onMintSurroundingPlotsConfirm = async (
    user_: PublicKey | null,
    provider_: AnchorProvider,
    coords_: Coordinates,
  ) => {
    if (!user_ || !provider_) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    onModalConfirm(
      () => {
        const transaction = new Transaction()
        surroundingPlotMintIxs.forEach((instruction) => {
          transaction.add(instruction)
        })
        return Promise.resolve(transaction)
      },
      () => {
        setSurroundingPlotModalShown(false)
      },
      defaultBuyErrorMessage,
    )
  }

  // OWNED PLOT

  const onPlantConfirm = async (coords_: Coordinates, seedMint_: string) => {
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    console.log('onPlantConfirm', seedMint_)
    if (!isValidPublicKey(seedMint_)) {
      setError('Invalid seed mint address')
      return
    }

    let accountInfo
    try {
      accountInfo = await provider.connection.getAccountInfo(new PublicKey(seedMint_))
      if (!accountInfo) {
        setError('Account for result token address not found')
        return
      }
    } catch (e) {
      setError('Failed to fetch account info for result token address')
      return
    }

    const isSplToken = accountInfo.owner.equals(TOKEN_PROGRAM_ID)
    if (!isSplToken) {
      setError('Result token address is not a SPL token')
      return
    }
    const farm = getFarmProgram(provider)

    // verify seed info
    const [seedInfoId] = PublicKey.findProgramAddressSync(
      [Buffer.from('seed_mint_info'), new PublicKey(seedMint_).toBuffer()],
      farm.programId,
    )

    let seedInfoAccount
    try {
      seedInfoAccount = await farm.account.seedMintInfo.fetch(seedInfoId)
    } catch (e) {
      setError('Seed not found')
      return
    }

    if (seedInfoAccount.plantMint === PublicKey.default) {
      setError('Seed not found')
      return
    }

    const [userSeedAta] = PublicKey.findProgramAddressSync(
      [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(seedMint_).toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const seedBalance = await provider.connection.getTokenAccountBalance(userSeedAta)

    if (new BN(seedBalance.value.amount).isZero()) {
      setError('You do not have any seeds in your wallet')
      return
    }

    onModalConfirm(
      () =>
        plantSeedTx(
          //  verified above
          wallet.publicKey as PublicKey,
          provider,
          coords_.x,
          coords_.y,
          new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
          new PublicKey(seedMint_),
        ),
      () => {
        setIsOwnedPlotModalShown(false)
      },
      'Planting failed, check if you have necessary seed',

      // (walletPrivateKey: string) => plant(coords.x, coords.y, seedType_, walletPrivateKey),
      // () => setIsPlantModalShown(false),
      // defaultPlantErrorMessage,
    )
  }

  const onDepositToPlotConfirm = async (coords_: Coordinates, amount: number) => {
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    if (!amount || amount <= 0) {
      setError('Invalid amount')
      return
    }

    onModalConfirm(
      () =>
        depositToPlotTx(
          //  verified above
          wallet.publicKey as PublicKey,
          provider,
          coords_.x,
          coords_.y,
          new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
          new BN(amount),
        ),
      () => {
        setIsOwnedPlotModalShown(false)
        setIsOwnedPlantedModalShown(false)
      },
      'Depositing failed, check if you have necessary seed',
    )
  }

  const onReturnPlotConfirm = async (coords_: Coordinates) => {
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    onModalConfirm(
      () =>
        returnPlotTx(
          //  verified above
          wallet.publicKey as PublicKey,
          provider,
          coords_.x,
          coords_.y,
          new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
        ),
      () => {
        setIsOwnedPlotModalShown(false)
      },
      'Depositing failed, check if you have necessary seed',
    )
  }

  // PLANTED MODALS

  const onTendConfirm = async (coords_: Coordinates) => {
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    onModalConfirm(
      () =>
        tendPlantTx(
          //  verified above
          wallet.publicKey as PublicKey,
          provider,
          coords_.x,
          coords_.y,
          new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
        ),
      () => {
        setIsOwnedPlantedModalShown(false)
      },
      'Tending failed, something went wrong',
    )
  }

  const onHarvestConfirm = async (coords_: Coordinates) => {
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    onModalConfirm(
      () =>
        harvestPlantTx(
          //  verified above
          wallet.publicKey as PublicKey,
          provider,
          coords_.x,
          coords_.y,
          new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
        ),
      () => {
        setIsOwnedPlantedModalShown(false)
      },
      'Harvesting failed, something went wrong',
    )
  }

  const onRevertConfirm = async (coords_: Coordinates) => {
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    onModalConfirm(
      () =>
        revertPlantTx(
          //  verified above
          wallet.publicKey as PublicKey,
          provider,
          coords_.x,
          coords_.y,
          new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
        ),
      () => {
        setIsOwnedPlantedModalShown(false)
      },
      'Revert failed, something went wrong',
    )
  }

  // NON OWNED PLOT

  const onRevokeConfirm = async (coords_: Coordinates) => {
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    onModalConfirm(
      () =>
        revokePlotTx(
          //  verified above
          wallet.publicKey as PublicKey,
          provider,
          coords_.x,
          coords_.y,
          new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
        ),
      () => {
        setIsNonOwnedModalShown(false)
      },
      'Revert failed, something went wrong',
    )
  }

  useEffect(() => {
    const unsubscribeSelectedPlot = subscribeKey(selectedPlotStore, 'plot', async (plot: SelectedPlot) => {
      console.log('TRIGGERED')
      console.log(wallet)
      if (wallet?.publicKey === undefined) {
        return
      }

      console.log('plot:', plot.plotInfo)

      setSelectedPlotInfo(plot.plotInfo)
      onPlotSelect(plot.x, plot.y, plot.plotInfo, currentBlock)
    })

    return unsubscribeSelectedPlot
  }, [wallet?.publicKey, currentBlock])

  return (
    <>
      {isBuyPlotModalShown && selectedCoords && (
        <PlotModal
          title="Buy land plot? 💸"
          description={`You are about to buy plot located at [X : ${selectedCoords.x} | Y : ${selectedCoords.y}]`}
          confirmText={isLoading ? <Spinner /> : 'Buy'}
          cancelText="Cancel"
          onConfirm={() => onBuyPlotConfirm(wallet?.publicKey, provider, selectedCoords)}
          onCancel={() => hideModal()}
          waterLevel={waterLevel || 0}
        />
      )}
      {isSurroundingPlotModalShown && selectedCoords && (
        <PlotModal
          title="Surrounding plots not minted... ❔"
          description={`Before you can mint and buy at [X : ${selectedCoords.x} | Y : ${selectedCoords.y}] all surrounding plots need to be minted first. After minting try buying again.`}
          confirmText={isLoading ? <Spinner /> : 'Mint'}
          cancelText="Cancel"
          onConfirm={() => onMintSurroundingPlotsConfirm(wallet?.publicKey, provider, selectedCoords)}
          onCancel={() => hideModal()}
          waterLevel={waterLevel || 0}
        />
      )}
      {isOwnedPlotModalShown && selectedCoords && (
        <OwnedPlotModal
          isLoading={isLoading}
          onPlant={(seedMint: string) => onPlantConfirm(selectedCoords, seedMint)}
          onDeposit={(amount: number) => {
            onDepositToPlotConfirm(selectedCoords, amount)
          }}
          onReturn={() => {
            onReturnPlotConfirm(selectedCoords)
          }}
          onCancel={() => hideModal()}
          plotInfo={selectedPlotInfo}
        />
      )}
      {isOwnedPlantedModalShown && selectedCoords && (
        <OwnedPlantedModal
          isLoading={isLoading}
          onTend={() => onTendConfirm(selectedCoords)}
          onHarvest={() => {
            onHarvestConfirm(selectedCoords)
          }}
          onRevert={() => {
            onRevertConfirm(selectedCoords)
          }}
          onDeposit={(amount: number) => {
            onDepositToPlotConfirm(selectedCoords, amount)
          }}
          onCancel={() => hideModal()}
          plotInfo={selectedPlotInfo}
          currentBlock={currentBlock}
        />
      )}
      {isNonOwnedModalShown && selectedCoords && (
        <NonOwnedPlotModal
          isLoading={isLoading}
          onRevoke={() => onRevokeConfirm(selectedCoords)}
          onCancel={() => hideModal()}
          plotInfo={selectedPlotInfo}
        />
      )}
      {isNonOwnedModalShown ||
      isOwnedPlantedModalShown ||
      isOwnedPlotModalShown ||
      isBuyPlotModalShown ||
      isSurroundingPlotModalShown ? (
        <div>
          <div className="text-center mt-5 bg-black bg-opacity-50">
            {error && <div className="text-red-500">{error}</div>}
          </div>
          <div className="text-center mt-5 bg-black bg-opacity-50">
            {message && <div className="text-green-500">{message}</div>}
          </div>
        </div>
      ) : (
        <div />
      )}
    </>
  )
}

export default PlotActionModals
