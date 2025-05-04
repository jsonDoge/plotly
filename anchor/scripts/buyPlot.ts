import { AnchorProvider, Idl, Program, Wallet, web3 } from '@coral-xyz/anchor'
import path from 'path'
import fs from 'fs'
import { Farm } from '@project/anchor'
import { increasedCUTxWrap, mintAndBuyPlot, mintSeeds, plantSeed, toLeBytes } from '../tests/helpers'
import FarmIDL from '../target/idl/farm.json'

// so that the plotCurrency address would be the same
const localnetPlotCurrencyKeypairPath = './localnet/plotCurrency.json'

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
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const program = getFarmProgram(provider)

  const keypairData = JSON.parse(fs.readFileSync(path.join(process.cwd(), localnetPlotCurrencyKeypairPath), 'utf8'))
  const plotCurrencyKeypair = web3.Keypair.fromSecretKey(new Uint8Array(keypairData))

  const plotCurrency = plotCurrencyKeypair.publicKey

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

  const seedsToMint = 25
  const plantTokensPerSeed = 5
  const growthBlockDuration = 1008
  const waterDrainRate = 10
  const timesToTend = 1
  const balanceAbsorbRate = 2 // highly consuming

  const seedMint = await mintSeeds(
    provider,
    program,
    plotCurrency,
    plotCurrency,
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

  console.log('succsessfully acquired plot:', plotMint.toString())
  console.log('seed mint:', seedMint.toString())
  // Add your deploy script here.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
