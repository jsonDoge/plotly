import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'

import { PublicKey } from '@solana/web3.js'
import assert from 'node:assert'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { increasedCUTxWrap, toLeBytes } from './helpers'

describe('seed minting', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()

  const userWallet = provider.wallet as anchor.Wallet
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const program = anchor.workspace.Farm as anchor.Program<Farm>
  const umi = createUmi('http://localhost:8899')
  let plotCurrency: PublicKey

  beforeEach(async () => {
    plotCurrency = await setupMint(provider, TOKEN_PROGRAM_ID)
    await setupFarm(provider, program, plotCurrency, userWallet.publicKey)
  }, 1000000)

  it('Should mint expected amount of seeds', async () => {
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)

    const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )

    const [userPlotCurrencyAta] = anchor.web3.PublicKey.findProgramAddressSync(
      [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plotCurrency.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 1000
    const waterRate = 10
    const timesToTend = 5
    const balanceDrainRate = 2

    const [seedMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('seed_mint'),
        farm.toBuffer(),
        plantMint.toBuffer(),
        toLeBytes(plantTokensPerSeed, 8),
        userPlotCurrencyAta.toBuffer(),
      ],
      program.programId,
    )

    console.log('plantMint', plantMint.toString())
    console.log('plotMint', plotCurrency.toString())
    console.log('treasury', userPlotCurrencyAta.toString())
    try {
      await wrapTx(
        program.methods
          .mintSeeds(
            plotCurrency,
            new anchor.BN(seedsToMint),
            new anchor.BN(plantTokensPerSeed),
            growthBlockDuration,
            waterRate,
            new anchor.BN(balanceDrainRate),
            timesToTend,
            userPlotCurrencyAta,
          )
          .accountsPartial({
            plotCurrencyMint: plotCurrency,
            user: userWallet.publicKey,
            plantMint,
            seedMint,
            farm,
          })
          .signers([userWallet.payer]),
      )
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    const userSeedTokenAccount = await getAssociatedTokenAddress(
      seedMint, // your SPL token mint public key
      userWallet.publicKey, // user's wallet public key
    )

    const userSeedTokenAccountInfo = await program.provider.connection.getTokenAccountBalance(userSeedTokenAccount)

    assert(parseInt(userSeedTokenAccountInfo.value.amount, 10) === seedsToMint, 'User should expected amount of seeds')
  }, 1000000)
})
