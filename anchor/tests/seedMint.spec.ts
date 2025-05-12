import * as anchor from '@coral-xyz/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { PublicKey } from '@solana/web3.js'
import assert from 'node:assert'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { increasedCUTxWrap, toLeBytes } from './helpers'

const metadataPublicKey = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

function readString(buffer: Buffer, offset: number): [string, number] {
  // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
  let offset_ = offset
  const len = buffer.readUInt32LE(offset_)
  offset_ += 4
  const str = buffer.slice(offset_, offset_ + len).toString('utf-8')
  offset_ += len
  return [str, offset_]
}

describe('seed minting', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()

  const userWallet = provider.wallet as anchor.Wallet
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const program = anchor.workspace.Farm as anchor.Program<Farm>
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
    const neighborToCenterwaterRate = 10
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

    try {
      await wrapTx(
        program.methods
          .mintSeeds(
            plotCurrency,
            new anchor.BN(seedsToMint),
            new anchor.BN(plantTokensPerSeed),
            growthBlockDuration,
            neighborToCenterwaterRate,
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

    const seedMetadata = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), metadataPublicKey.toBuffer(), seedMint.toBuffer()],
      metadataPublicKey,
    )[0]

    const seedMetadataInfo = await program.provider.connection.getAccountInfo(seedMetadata)
    if (!seedMetadataInfo) {
      throw new Error('Seed metadata not found')
    }

    let offset = 0
    offset += 1 + 32 // skip optional update_authority (1 byte + 32 if present)
    offset += 32 // skip mint

    const [name, afterName] = readString(seedMetadataInfo.data, offset)
    const [symbol] = readString(seedMetadataInfo.data, afterName)

    expect(Buffer.from(name.replace(/\0/g, '')).toString('utf-8')).toEqual('Seed (Token)')
    expect(Buffer.from(symbol.replace(/\0/g, '')).toString('utf-8')).toEqual('SEED-TKN')

    assert(
      parseInt(userSeedTokenAccountInfo.value.amount, 10) === seedsToMint,
      'User should have the expected amount of seeds',
    )
  }, 1000000)

  it('Should still mint seeds if metadata is not found', async () => {
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID, 6, undefined, true)

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
    const neighborToCenterwaterRate = 10
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
            neighborToCenterwaterRate,
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

    const seedMetadata = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), metadataPublicKey.toBuffer(), seedMint.toBuffer()],
      metadataPublicKey,
    )[0]

    const seedMetadataInfo = await program.provider.connection.getAccountInfo(seedMetadata)
    if (!seedMetadataInfo) {
      throw new Error('Seed metadata not found')
    }

    let offset = 0
    offset += 1 + 32 // skip optional update_authority (1 byte + 32 if present)
    offset += 32 // skip mint

    const [name, afterName] = readString(seedMetadataInfo.data, offset)
    const [symbol] = readString(seedMetadataInfo.data, afterName)

    expect(Buffer.from(name.replace(/\0/g, '')).toString('utf-8')).toEqual('Seed (Plotly)')
    expect(Buffer.from(symbol.replace(/\0/g, '')).toString('utf-8')).toEqual('SEED-PLT')

    const userSeedTokenAccountInfo = await program.provider.connection.getTokenAccountBalance(userSeedTokenAccount)

    assert(parseInt(userSeedTokenAccountInfo.value.amount, 10) === seedsToMint, 'User should expected amount of seeds')
  }, 1000000)
})
