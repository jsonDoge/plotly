// import { Contract, Wallet } from 'ethers'

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

export const waitTx = async (tx: any): Promise<undefined> => (await tx).wait()
