import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { fetchDigitalAsset, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { PublicKey as umiPublicKey } from '@metaplex-foundation/umi'

import { PublicKey } from '@solana/web3.js'
import assert from 'node:assert'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { increasedCUTxWrap, toLeBytes } from './helpers'

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

  it('Should mint the same plot NFT only ONCE', async () => {
    console.log('Running test')
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
      await wrapTx(
        program.methods
          .mintPlot(plotX, plotY, plotCurrency)
          .accounts({
            user: userWallet.publicKey,
            plotMint,
          })
          .signers([userWallet.payer]),
      )
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    try {
      await wrapTx(
        program.methods
          .acquirePlot(plotX, plotY, plotCurrency)
          .accounts({
            user: userWallet.publicKey,
            plotMint,
            plotCurrencyMint: plotCurrency,
          })
          .signers([userWallet.payer]),
      )
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

    const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMint.toBuffer()],
      program.programId,
    )

    const plotAccount = await program.account.plot.fetch(plotId)

    console.log('last claimer', plotAccount.lastClaimer.toString())
    console.log('user', userWallet.publicKey.toString())
    assert(plotAccount.lastClaimer.toString() === userWallet.publicKey.toString(), 'Last claimer should be user')
    // assert(metadata)/
    // const metadataAccount = await umi.rpc.getAccount(metadataPda)

    // console.log('Your transaction signature', tx)

    let txFailed = false
    try {
      await wrapTx(
        program.methods
          .acquirePlot(plotX, plotY, plotCurrency)
          .accounts({
            user: userWallet.publicKey,
            plotMint,
            plotCurrencyMint: plotCurrency,
          })
          .signers([userWallet.payer]),
      )
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

    try {
      await wrapTx(
        program.methods
          .mintPlot(plotX5, plotY5, plotCurrency)
          .accounts({
            user: userWallet.publicKey,
            plotMint: plotMint55,
          })
          .signers([userWallet.payer]),
      )
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    try {
      await wrapTx(
        program.methods
          .acquirePlot(plotX5, plotY5, plotCurrency)
          .accounts({
            user: userWallet.publicKey,
            plotMint: plotMint55,
            plotCurrencyMint: plotCurrency,
          })
          .signers([userWallet.payer]),
      )
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
      await wrapTx(
        program.methods
          .mintPlot(plotX2, plotY3, plotCurrency)
          .accounts({
            user: userWallet.publicKey,
            plotMint: plotMint23,
          })
          .signers([userWallet.payer]),
      )
    } catch (error) {
      console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    }

    try {
      await wrapTx(
        program.methods
          .acquirePlot(plotX2, plotY3, plotCurrency)
          .accounts({
            user: userWallet.publicKey,
            plotMint: plotMint23,
            plotCurrencyMint: plotCurrency,
          })
          .signers([userWallet.payer]),
      )
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

    // console.log('Metadata:', metadata)

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
