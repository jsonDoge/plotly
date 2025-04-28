import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { fetchDigitalAsset, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { PublicKey as umiPublicKey, some } from '@metaplex-foundation/umi'

import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import assert from 'node:assert'
import { toLeBytes } from '@project/anchor'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { mintAndBuyPlot, mintSeeds, plantSeed } from './helpers'

// equivalent to rust to_le_bytes

const modifyComputeUnits = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
  units: 400_000,
})

const increasedCUTxWrap = (connection: Connection, payer: Keypair) => async (rawTx: any) => {
  const tx = await rawTx.transaction()
  tx.add(modifyComputeUnits)
  return sendAndConfirmTransaction(connection, tx, [payer])
}

describe('farm', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()

  const userWallet = provider.wallet as anchor.Wallet
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const program = anchor.workspace.Farm as anchor.Program<Farm>
  const umi = createUmi('http://localhost:8899')
  let plotCurrency: PublicKey

  console.log('Loading plotly outer at :', program.programId.toString())

  beforeEach(async () => {
    plotCurrency = await setupMint(provider, TOKEN_PROGRAM_ID)
    await setupFarm(provider, program, plotCurrency, userWallet.publicKey)
  }, 10000000)

  it('Should plant a seed', async () => {
    console.log('Running plant seed test')
    // Add your test here.
    const plotX = 1
    const plotY = 1

    // const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    //   [Buffer.from('farm'), plotCurrency.toBuffer()],
    //   program.programId,
    // )

    // const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    //   [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    //   program.programId,
    // )

    console.log('minting plots and buying')
    await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 1000
    const waterRate = 10
    const balanceRate = 1

    console.log('setting up plant mint')
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)

    console.log('creating seed')

    const seedMint = await mintSeeds(
      provider,
      program,
      plotCurrency,
      plantMint,
      userWallet,
      seedsToMint,
      plantTokensPerSeed,
      growthBlockDuration,
      waterRate,
      balanceRate,
    )

    console.log('planting seed')

    await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

    // assert(txFailed, 'Transaction should have failed')

    // userTokenAccountInfo = await program.provider.connection.getTokenAccountBalance(userTokenAccount)

    // assert(parseInt(userTokenAccountInfo.value.amount, 10) === 1, 'User should STILL own 1 plot NFT')
  }, 1000000)
})
