import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { CollectionDetails, fetchDigitalAsset, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { PublicKey as umiPublicKey, some } from '@metaplex-foundation/umi'

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

describe('farm', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()

  const userWallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Farm as anchor.Program<Farm>
  const umi = createUmi('http://localhost:8899')
  let plotCurrency: PublicKey

  beforeEach(async () => {
    plotCurrency = await setupMint(provider, TOKEN_PROGRAM_ID)
    await setupFarm(provider, program, plotCurrency, userWallet.publicKey)
  })

  it('Should mint the same plot NFT only ONCE', async () => {
    // Add your test here.
    const plotX = 1
    const plotY = 1

    const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )

    const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
      program.programId,
    )
    // const [plotMintAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
    //   [Buffer.from('plot_mint_authority')],
    //   program.programId,
    // )

    try {
      await program.methods
        .mintPlot(plotX, plotY, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
        })
        .signers([userWallet.payer])
        .rpc()
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    try {
      await program.methods
        .acquirePlot(plotX, plotY, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
        })
        .signers([userWallet.payer])
        .rpc()
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    const userTokenAccount = await getAssociatedTokenAddress(
      plotMint, // your SPL token mint public key
      userWallet.publicKey, // user's wallet public key
    )

    let userTokenAccountInfo = await program.provider.connection.getTokenAccountBalance(userTokenAccount)

    assert(parseInt(userTokenAccountInfo.value.amount, 10) === 1, 'User should own 1 plot NFT')

    const metadataPda = await findMetadataPda(umi, { mint: plotMint.toString() as umiPublicKey }) // mint is the NFT mint public key
    console.log('Metadata PDA:', metadataPda.toString())

    const metadata = await fetchDigitalAsset(umi, plotMint.toString() as umiPublicKey, {
      commitment: 'confirmed',
    })

    // console.log('Metadata:', metadata)

    assert(metadata.metadata.name === 'Plot (1, 1)', 'Mints correct NFT name')
    assert(metadata.metadata.symbol === 'PLT-1-1', 'Mints correct NFT symbol')

    const collectionMintAddr = (metadata.metadata.collection as any)?.value?.key

    const collectionMint = await fetchDigitalAsset(umi, collectionMintAddr as umiPublicKey, {
      commitment: 'confirmed',
    })

    // console.log('Metadata:', collectionMint.metadata.collectionDetails)

    //  { __option: 'Some', value: { __kind: 'V1', size: 1n } }
    const { value } = collectionMint.metadata.collectionDetails as any

    console.log('Collection size:', value)

    assert(new anchor.BN(value.size).eq(new anchor.BN(1)), 'Collection should have 1 NFT')

    // assert(metadata)/
    // const metadataAccount = await umi.rpc.getAccount(metadataPda)

    // console.log('Your transaction signature', tx)

    let txFailed = false
    try {
      await program.methods
        .acquirePlot(plotX, plotY, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
        })
        .signers([userWallet.payer])
        .rpc()
    } catch (error) {
      txFailed = true
    }

    assert(txFailed, 'Transaction should have failed')

    userTokenAccountInfo = await program.provider.connection.getTokenAccountBalance(userTokenAccount)

    assert(parseInt(userTokenAccountInfo.value.amount, 10) === 1, 'User should STILL own 1 plot NFT')
  }, 1000000)

  it('Should mint be able to mint separate Plot NFTs and track supply', async () => {
    // Add your test here.
    const plotX5 = 5
    const plotY5 = 5

    const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )

    const [plotMint55] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(plotX5), toLeBytes(plotY5), farm.toBuffer()],
      program.programId,
    )

    let tx

    try {
      tx = await program.methods
        .mintPlot(plotX5, plotY5, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint: plotMint55,
        })
        .signers([userWallet.payer])
        .rpc()
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    try {
      tx = await program.methods
        .acquirePlot(plotX5, plotY5, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint: plotMint55,
        })
        .signers([userWallet.payer])
        .rpc()
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    const plotX2 = 2
    const plotY3 = 3

    const [plotMint23] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(plotX2), toLeBytes(plotY3), farm.toBuffer()],
      program.programId,
    )

    try {
      tx = await program.methods
        .mintPlot(plotX2, plotY3, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint: plotMint23,
        })
        .signers([userWallet.payer])
        .rpc()
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    try {
      tx = await program.methods
        .acquirePlot(plotX2, plotY3, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint: plotMint23,
        })
        .signers([userWallet.payer])
        .rpc()
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    const userTokenAccount11 = await getAssociatedTokenAddress(plotMint55, userWallet.publicKey)

    const userTokenAccount23 = await getAssociatedTokenAddress(plotMint23, userWallet.publicKey)

    const userTokenAccountInfo11 = await program.provider.connection.getTokenAccountBalance(userTokenAccount11)
    const userTokenAccountInfo23 = await program.provider.connection.getTokenAccountBalance(userTokenAccount23)

    assert(parseInt(userTokenAccountInfo11.value.amount, 10) === 1, 'User should own 1 plot NFT (1, 1)')
    assert(parseInt(userTokenAccountInfo23.value.amount, 10) === 1, 'User should own 1 plot NFT (2, 3)')

    const metadata = await fetchDigitalAsset(umi, plotMint55.toString() as umiPublicKey, {
      commitment: 'confirmed',
    })

    console.log('Metadata:', metadata)

    const collectionMintAddr = (metadata.metadata.collection as any)?.value?.key

    const collectionMint = await fetchDigitalAsset(umi, collectionMintAddr as umiPublicKey, {
      commitment: 'confirmed',
    })

    // console.log('Metadata:', collectionMint.metadata.collectionDetails)

    //  { __option: 'Some', value: { __kind: 'V1', size: 1n } }
    const { value } = collectionMint.metadata.collectionDetails as any

    console.log('Collection size:', value)

    assert(new anchor.BN(value.size).eq(new anchor.BN(2)), 'Correctly increments collection size')
  }, 1000000)
})
