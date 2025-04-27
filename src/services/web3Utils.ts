// import { Contract, Wallet } from 'ethers'

import { Connection, PublicKey } from '@solana/web3.js'
import { PLOTLY_PROGRAM_ID as programId, toLeBytes } from '@project/anchor'
import * as anchor from '@coral-xyz/anchor'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PlotInfo, RawPlot } from '@/components/game/utils/interfaces'
import { getPlotColor } from '@/components/game/utils/plotColors'

// services
// import getProvider from './provider'

// constants
// import { CONTRACT_TYPE } from '../utils/constants'

// // contract abis
// import dishAbi from '../contracts/dish.abi.json'
// import erc20Abi from '../contracts/erc20.abi.json'
// import plotAbi from '../contracts/plot.abi.json'
// import farmAbi from '../contracts/farm.abi.json'

// interface GetContractOptions {
//   isSignerRequired: boolean
//   privateKey?: string
// }

/**
 *
 * @param {string} address
 * @param {string} type
 * @param { isSignerRequired = false, privateKey } options
 * @returns Contract
 */
// export const getContract = (
//   address: string,
//   type: string,
//   options: GetContractOptions = { isSignerRequired: false },
// ) => {
//   const web3Provider = getProvider()

//   if (options.isSignerRequired && !options.privateKey) {
//     throw new Error('wallet key not provided')
//   }

//   const web3ProviderOrSigner = options.isSignerRequired
//     ? new Wallet(options.privateKey as string, web3Provider)
//     : web3Provider

//   switch (type) {
//     case CONTRACT_TYPE.FARM:
//       return new Contract(address, farmAbi, web3ProviderOrSigner)
//     case CONTRACT_TYPE.ERC20:
//       return new Contract(address, erc20Abi, web3ProviderOrSigner)
//     case CONTRACT_TYPE.PLOT:
//       return new Contract(address, plotAbi, web3ProviderOrSigner)
//     case CONTRACT_TYPE.DISH:
//       return new Contract(address, dishAbi, web3ProviderOrSigner)
//     default:
//       throw new Error('Unknown contract type')
//   }
// }

// export const getBlockNumber = async () => {
//   const provider = getProvider()

//   return provider.getBlockHeight().send()
// }

export const mapRawPlotToPlotInfo = (
  user: PublicKey,
  rawPlot: RawPlot,
): PlotInfo => {
  const isOwner = !!rawPlot.data && rawPlot.data.lastClaimer.toString() === user.toString()
  const isPlantOwner = false
  const isUnminted = !rawPlot.data
  
  return {
    isOwner,
    isPlantOwner,
    isUnminted,
    seedType: undefined,

    // plant
    plantState: undefined,
    plantedBlockNumber: undefined,
    overgrownBlockNumber: undefined,
    waterAbsorbed: undefined,

    // plot
    color: getPlotColor(isOwner, isPlantOwner, isUnminted),
    lastStateChangeBlock: undefined,
    waterLevel: 0,
  }
}

export const getFarmId = (plotCurrencyId: PublicKey): PublicKey => {
  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrencyId.toBuffer()],
    programId,
  )
  return farm
}

export const getFarmPlotMintAtaOwnerId = (farmId: PublicKey): PublicKey => {
  const [ownerId] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm_associated_plot_authority'), farmId.toBuffer()],
    programId,
  )
  return ownerId
}

export const getPlotMintId = (x: number, y: number, plotCurrencyId: PublicKey): PublicKey => {
  if (x < 0 || y < 0 || x > 999 || y > 999) {
    throw new Error('Invalid coordinates')
  }
  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrencyId.toBuffer()],
    programId,
  )

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(x), toLeBytes(y), farm.toBuffer()],
    programId,
  )

  return plotMint
}

// neighbor account containing plot game info
export const getPlotId = (plotMintId: PublicKey): PublicKey => {
  const [plot] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('plot'), plotMintId.toBuffer()], programId)

  return plot
}

export const getPlotMintAtaId = (
  plotMintId: PublicKey,
  plotOwnerId: PublicKey,
  allowOwnerOffCurve: boolean = true,
): PublicKey => {
  return getAssociatedTokenAddressSync(plotMintId, plotOwnerId, allowOwnerOffCurve)
}

export const getAccountInfos = async (connection: Connection, accountIds: PublicKey[]): Promise<any> => {
  return connection.getMultipleParsedAccounts(accountIds)
}

export const waitTx = async (tx: any): Promise<undefined> => (await tx).wait()
