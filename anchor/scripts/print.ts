import { AnchorProvider, Idl, Program, Wallet, web3 } from '@coral-xyz/anchor'
import path from 'path'
import fs from 'fs'
import { Farm } from '@project/anchor'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { setupMint } from '../tests/setup'
import { createRecipe, increasedCUTxWrap, mintAndBuyPlot, mintSeeds, plantSeed, toLeBytes } from '../tests/helpers'
import FarmIDL from '../target/idl/farm.json'

// so that the plotCurrency address would be the same
const localnetPlotCurrencyKeypairPath = './localnet/plotCurrency.json'

// eslint-disable-next-line global-require
const farmIdl = require('../target/idl/farm.json') as Idl
const anchor = require('@coral-xyz/anchor')

function getFarmProgram(provider: AnchorProvider): Program<Farm> {
  return new Program(FarmIDL as Farm, provider)
}

const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

async function main() {
  // Configure client to use the provider.
  // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
  const provider_ = anchor.AnchorProvider.env()

  const network = process.env.NETWORK || 'localnet'

  if (!['devnet', 'localnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}. Must be one of "devnet" or "localnet".`)
  }

  const connection = new web3.Connection(provider_.connection.rpcEndpoint, {
    commitment: 'confirmed',
  })

  const provider = new AnchorProvider(connection, provider_.wallet)
  anchor.setProvider(provider)

  console.log('Provider:', provider.connection.rpcEndpoint)

  const program = getFarmProgram(provider)

  const keypairData = JSON.parse(fs.readFileSync(path.join(process.cwd(), localnetPlotCurrencyKeypairPath), 'utf8'))
  const plotCurrencyKeypair = web3.Keypair.fromSecretKey(new Uint8Array(keypairData))

  let plotCurrency
  if (network === 'localnet') {
    plotCurrency = plotCurrencyKeypair.publicKey
    console.log('Plot currency:', plotCurrency.toString())
  } else {
    plotCurrency = DEVNET_USDC_MINT
    console.log('Plot currency:', DEVNET_USDC_MINT.toString())
  }

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [farmAuth] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm_auth'), farm.toBuffer()],
    program.programId,
  )

  console.log('Farm ID (non-program):', farm.toString())
  console.log('Farm auth:', farmAuth.toString())
  // Add your deploy script here.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
