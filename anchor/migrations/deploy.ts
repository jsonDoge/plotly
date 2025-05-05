// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { AnchorProvider, Idl, Program, web3 } from '@coral-xyz/anchor'
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import path from 'path'
import fs from 'fs'
import { setupFarm, setupMint } from '../tests/setup'
// import { FarmIDL } from '@project/anchor'

// so that the plotCurrency address would be the same
const localnetPlotCurrencyKeypairPath = './anchor/localnet/plotCurrency.json'
const userKeypairPath = './anchor/localnet/testUser.json'

// eslint-disable-next-line global-require
const farmIdl = require('../target/idl/farm.json') as Idl
const anchor = require('@coral-xyz/anchor')

function getFarmProgram(provider: AnchorProvider): Program<typeof farmIdl> {
  return new Program<typeof farmIdl>(farmIdl, provider)
}

function getFarmProgramId(network: string): PublicKey {
  switch (network) {
    case 'localnet':
      return new PublicKey(farmIdl.address)
    case 'devnet':
      return new PublicKey(farmIdl.address)
    default:
      throw new Error(`Unsupported network: ${network}`)
  }
}

const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

module.exports = async function (provider_: AnchorProvider) {
  // Configure client to use the provider.

  const network = process.env.NETWORK || 'localnet'

  if (!['devnet', 'localnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}. Must be one of "devnet" or "localnet".`)
  }
  console.log('Deploying to network: ', network)

  const connection = new web3.Connection(provider_.connection.rpcEndpoint, {
    commitment: 'confirmed',
  })

  const provider = new AnchorProvider(connection, provider_.wallet)
  anchor.setProvider(provider)

  console.log('Provider:', provider.connection.rpcEndpoint)

  const { wallet } = provider

  if (!wallet.payer) {
    console.log('Couldnt find payer')
    return
  }

  const program = getFarmProgram(provider)

  const plotlyId = getFarmProgramId(network)

  const keypairData = JSON.parse(fs.readFileSync(path.join(process.cwd(), localnetPlotCurrencyKeypairPath), 'utf8'))
  const keypair = web3.Keypair.fromSecretKey(new Uint8Array(keypairData))
  console.log('setting up plot currency mint:', keypair.publicKey.toString())

  let plotCurrency

  if (network === 'localnet') {
    plotCurrency = await setupMint(provider, TOKEN_PROGRAM_ID, 6, keypair)
  } else if (network === 'devnet') {
    plotCurrency = DEVNET_USDC_MINT
  } else {
    throw new Error(`Unsupported network: ${network}`)
  }

  if (network === 'localnet') {
    const otherUserKeypairData = JSON.parse(fs.readFileSync(path.join(process.cwd(), userKeypairPath), 'utf8'))
    const otherUserKeypair = web3.Keypair.fromSecretKey(new Uint8Array(otherUserKeypairData))

    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      plotCurrency,
      otherUserKeypair.publicKey,
      false,
      undefined,
      undefined,
    )
    // send to other user
    await mintTo(provider.connection, wallet.payer, plotCurrency, ata.address, wallet.payer, 100_000_000)
  }

  console.log('Currency setup successfully:', plotCurrency.toString())

  await setupFarm(provider, program, plotCurrency, wallet.publicKey)

  const [farmField] = PublicKey.findProgramAddressSync(
    [Buffer.from('farm_field'), plotCurrency.toBuffer()],
    program.programId,
  )

  console.log('Farm field:', farmField.toString())
  console.log('Farm setup complete')
  // Add your deploy script here.
}
