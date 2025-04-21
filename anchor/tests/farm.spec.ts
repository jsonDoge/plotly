import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { fetchDigitalAsset, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { PublicKey } from '@metaplex-foundation/umi'

import { sendAndConfirmTransaction } from '@solana/web3.js'
import assert from 'node:assert'
import { Farm } from '../target/types/farm'

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

  it('Should mint a plot NFT only ONCE', async () => {
    // Add your test here.
    const plotX = 1
    const plotY = 1

    const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY)],
      program.programId,
    )

    let tx
    try {
      tx = await program.methods
        .acquirePlot(plotX, plotY)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
        })
        .signers([userWallet.payer])
        .transaction()

      tx?.add(modifyComputeUnits)
      await sendAndConfirmTransaction(provider.connection, tx, [userWallet.payer])
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    const userTokenAccount = await getAssociatedTokenAddress(
      plotMint, // your SPL token mint public key
      userWallet.publicKey, // user's wallet public key
    )

    const userTokenAccountInfo = await program.provider.connection.getTokenAccountBalance(userTokenAccount)

    assert(parseInt(userTokenAccountInfo.value.amount, 10) === 1, 'User should own 1 plot NFT')

    const metadataPda = await findMetadataPda(umi, { mint: plotMint.toString() as PublicKey }) // mint is the NFT mint public key
    console.log('Metadata PDA:', metadataPda.toString())

    const metadata = await fetchDigitalAsset(umi, plotMint.toString() as PublicKey, {
      commitment: 'confirmed',
    })

    console.log('Metadata:', metadata)
    console.log('Collection:', metadata.metadata.collection)

    const collectionMintAddr = (metadata.metadata.collection as any)?.value?.key

    console.log('Collection Mint Address:', collectionMintAddr)

    const collectionMint = await fetchDigitalAsset(umi, collectionMintAddr as PublicKey, {
      commitment: 'confirmed',
    })

    console.log('Metadata:', collectionMint)

    // assert(metadata)/
    // const metadataAccount = await umi.rpc.getAccount(metadataPda)

    // console.log('Your transaction signature', tx)

    let txFailed = false
    try {
      tx = await program.methods
        .acquirePlot(plotX, plotY)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
        })
        .signers([userWallet.payer])
        .transaction()

      tx?.add(modifyComputeUnits)
      await sendAndConfirmTransaction(provider.connection, tx, [userWallet.payer])
    } catch (error) {
      txFailed = true
    }

    assert(txFailed, 'Transaction should have failed')
    assert(parseInt(userTokenAccountInfo.value.amount, 10) === 1, 'User should STILL own 1 plot NFT')
  }, 1000000)
})
