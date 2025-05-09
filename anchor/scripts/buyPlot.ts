import { AnchorProvider, Idl, Program, Wallet, web3 } from '@coral-xyz/anchor'
import path from 'path'
import fs from 'fs'
import { Farm } from '@project/anchor'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { setupMint } from '../tests/setup'
import {
  createOffer,
  createRecipe,
  // increasedCUTxWrap,
  mintAndBuyPlot,
  mintSeeds,
  plantSeed,
  toLeBytes,
} from '../tests/helpers'
import FarmIDL from '../target/idl/farm.json'

// so that the plotCurrency address would be the same
const localnetPlotCurrencyKeypairPath = './localnet/plotCurrency.json'
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

// eslint-disable-next-line global-require
const farmIdl = require('../target/idl/farm.json') as Idl
const anchor = require('@coral-xyz/anchor')

function getFarmProgram(provider: AnchorProvider): Program<Farm> {
  return new Program(FarmIDL as Farm, provider)
}
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

  const userWallet = provider.wallet as Wallet
  // const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const program = getFarmProgram(provider)

  const keypairData = JSON.parse(fs.readFileSync(path.join(process.cwd(), localnetPlotCurrencyKeypairPath), 'utf8'))
  const plotCurrencyKeypair = web3.Keypair.fromSecretKey(new Uint8Array(keypairData))

  let plotCurrency: PublicKey
  if (network === 'localnet') {
    plotCurrency = plotCurrencyKeypair.publicKey
  } else if (network === 'devnet') {
    plotCurrency = DEVNET_USDC_MINT
  } else {
    throw new Error(`Unsupported network: ${network}`)
  }

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [farmAuth] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm_auth'), farm.toBuffer()],
    program.programId,
  )

  console.log('Farm:', farm.toString())
  console.log('Farm auth:', farmAuth.toString())

  const plotX = 5
  const plotY = 5

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  const seedOutput = await setupMint(provider, TOKEN_PROGRAM_ID)

  const seedsToMint = 250
  const plantTokensPerSeed = 5
  const growthBlockDuration = 1008
  const waterDrainRate = 10
  const timesToTend = 1
  const balanceAbsorbRate = 2 // highly consuming

  const seedMint = await mintSeeds(
    provider,
    program,
    plotCurrency,
    seedOutput,
    userWallet,
    seedsToMint,
    plantTokensPerSeed,
    growthBlockDuration,
    waterDrainRate,
    timesToTend,
    balanceAbsorbRate,
  )

  await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)
  await mintAndBuyPlot(provider, program, plotCurrency, plotX + 2, plotY + 2, userWallet)

  await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

  const ingredient0 = await setupMint(provider, TOKEN_PROGRAM_ID)
  const ingredient1 = await setupMint(provider, TOKEN_PROGRAM_ID)

  const ingredient0TokenAta = await getAssociatedTokenAddress(ingredient0, userWallet.publicKey)
  const ingredient1TokenAta = await getAssociatedTokenAddress(ingredient1, userWallet.publicKey)

  const [recipeId] = await PublicKey.findProgramAddressSync(
    [
      Buffer.from('recipe'),
      ingredient0.toBuffer(),
      toLeBytes(BigInt(new anchor.BN(2).toString()), 8),
      ingredient1.toBuffer(),
      toLeBytes(BigInt(new anchor.BN(4).toString()), 8),
      plotCurrency.toBuffer(),
      ingredient0TokenAta.toBuffer(),
      ingredient1TokenAta.toBuffer(),
      farm.toBuffer(),
    ],
    program.programId,
  )

  await createRecipe(
    provider,
    program,
    plotCurrency,
    plotCurrency,
    ingredient0,
    ingredient1,
    new anchor.BN(2),
    new anchor.BN(4),
    new anchor.BN(100),
    userWallet,
    recipeId,
  )

  const userPlotCurrencyAta = await getAssociatedTokenAddress(plotCurrency, userWallet.publicKey)

  const [offerId] = await PublicKey.findProgramAddressSync(
    [
      Buffer.from('offer'),
      toLeBytes(BigInt(new anchor.BN(20).toString()), 8),
      seedMint.toBuffer(),
      userPlotCurrencyAta.toBuffer(),
      farm.toBuffer(),
    ],
    program.programId,
  )

  await createOffer(
    provider,
    program,
    plotCurrency,
    seedMint,
    new anchor.BN(20),
    new anchor.BN(100),
    userWallet,
    offerId,
  )

  console.log('succsessfully acquired plot:', plotMint.toString())
  console.log('seed mint:', seedMint.toString())
  console.log('ingredient 0 ID:', ingredient0.toString())
  console.log('ingredient 1 ID:', ingredient1.toString())
  console.log('result is PLOT currency ID:', plotCurrency.toString())

  console.log('Offer ID::', offerId.toString())
  console.log('recipe ID:', recipeId.toString())

  // Add your deploy script here.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
