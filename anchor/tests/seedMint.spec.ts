import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'

import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import assert from 'node:assert'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'

// equivalent to rust to_le_bytes
function toLeBytes(value: number, byteLength = 4, signed = false) {
  const buffer = Buffer.alloc(byteLength)

  let newVal: any = value

  switch (byteLength) {
    case 1:
      buffer.writeUInt8(value, 0)
      break
    case 2:
      if (signed) {
        buffer.writeInt16LE(value, 0)
      } else {
        buffer.writeUInt16LE(value, 0)
      }
      break
    case 4:
      if (signed) {
        buffer.writeInt32LE(value, 0)
      } else {
        buffer.writeUInt32LE(value, 0)
      }
      break
    case 8:
      if (typeof value !== 'bigint') {
        newVal = BigInt(value)
      }

      if (signed) {
        buffer.writeBigInt64LE(newVal, 0)
      } else {
        buffer.writeBigUInt64LE(newVal, 0)
      }

      // JS doesn't support 64-bit integers natively in all versions, so use BigInt
      break
    default:
      throw new Error('Unsupported byte length')
  }

  return buffer
}

const modifyComputeUnits = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
  units: 400_000,
})

describe('seed minting', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()

  const userWallet = provider.wallet as anchor.Wallet

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

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 1000
    const waterRate = 10
    const balanceRate = 1

    const [seedMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('seed_mint'),
        farm.toBuffer(),
        plantMint.toBuffer(),
        toLeBytes(plantTokensPerSeed, 8),
        userWallet.publicKey.toBuffer(),
      ],
      program.programId,
    )

    console.log('plantMint', plantMint.toString())
    console.log('plotMint', plotCurrency.toString())
    console.log('treasury', userWallet.publicKey.toString())
    try {
      const tx = await program.methods
        .mintSeeds(
          plotCurrency,
          new anchor.BN(seedsToMint),
          new anchor.BN(plantTokensPerSeed),
          growthBlockDuration,
          waterRate,
          new anchor.BN(balanceRate),
          userWallet.publicKey,
        )
        .accountsPartial({
          user: userWallet.publicKey,
          plantMint,
          seedMint,
          farm,
        })
        .signers([userWallet.payer])
        .transaction()

      tx.add(modifyComputeUnits)
      await sendAndConfirmTransaction(program.provider.connection, tx, [userWallet.payer])
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
