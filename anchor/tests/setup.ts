import * as anchor from '@coral-xyz/anchor'
import { PublicKey, sendAndConfirmTransaction, TransactionResponse } from '@solana/web3.js'
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createMetadataAccountV3, MPL_TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata'
import {
  createSignerFromKeypair,
  percentAmount,
  signerIdentity,
  PublicKey as umiPublicKey,
} from '@metaplex-foundation/umi'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Farm } from '../target/types/farm'

const farmIdl = require('../target/idl/farm.json') as anchor.Idl

const convertToSigner = (wallet: anchor.Wallet): anchor.web3.Signer => ({
  publicKey: wallet.publicKey,
  secretKey: wallet.payer.secretKey,
})

const getReturnLog = (confirmedTransaction: TransactionResponse) => {
  const prefix = 'Program return: '
  let log = confirmedTransaction?.meta?.logMessages?.find((log_) => log_.startsWith(prefix))
  if (!log) {
    return ['', '', Buffer.from('')]
  }
  log = log.slice(prefix.length)
  const [key, data] = log.split(' ', 2)
  const buffer = Buffer.from(data, 'base64')
  return [key, data, buffer]
}

export const setupMint = async (
  provider: anchor.Provider,
  tokenProgramId: PublicKey,
  tokenMintDecimals: number = 6,
  mintKeypair?: anchor.web3.Keypair,
  skipMetadata: boolean = false,
  name: string = 'Token',
  symbol: string = 'TKN',
): Promise<PublicKey> => {
  const payer = provider.wallet as anchor.Wallet
  const signer = convertToSigner(payer)

  const airdropSignature = await provider.connection.requestAirdrop(payer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
  await provider.connection.confirmTransaction(airdropSignature)

  let tokenMint
  if (mintKeypair) {
    tokenMint = mintKeypair.publicKey
    const mintExists = await provider.connection.getAccountInfo(mintKeypair.publicKey)

    // create mint if it doesn't exist
    if (!mintExists) {
      console.log('creating mint')

      tokenMint = await createMint(
        provider.connection,
        signer,
        signer.publicKey,
        null,
        tokenMintDecimals,
        mintKeypair,
        undefined,
        tokenProgramId,
      )
    } else {
      console.log('Account at setupMint keypair already exists')
    }
  } else {
    tokenMint = await createMint(
      provider.connection,
      signer,
      signer.publicKey,
      null,
      tokenMintDecimals,
      undefined,
      undefined,
      tokenProgramId,
    )
  }

  // create metadata account if it doesn't exist
  const [metadataPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('metadata'), new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID.toString()).toBuffer(), tokenMint.toBuffer()],
    new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID.toString()),
  )

  const metdataExists = await provider.connection.getAccountInfo(metadataPDA)

  if (!metdataExists && !skipMetadata) {
    const umi = createUmi(provider.connection)

    const keypair = fromWeb3JsKeypair(payer.payer)

    const umiSigner = createSignerFromKeypair(umi, keypair)

    umi.use(signerIdentity(umiSigner))

    const metadataArgs = {
      mint: tokenMint.toString() as umiPublicKey,
      mintAuthority: umi.identity,
      payer: umi.identity,
      updateAuthority: umi.identity,
      data: {
        name,
        symbol,
        uri: '',
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }

    await createMetadataAccountV3(umi, metadataArgs).sendAndConfirm(umi)
  }

  // get ata
  const canOwnerBeOffCurve = false

  const ata = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    signer,
    tokenMint,
    signer.publicKey,
    canOwnerBeOffCurve,
    undefined,
    undefined,
  )

  // mint tokens to ata

  await mintTo(provider.connection, signer, tokenMint, ata.address, signer, 100_000_000)

  return tokenMint
}

const modifyComputeUnits = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
  units: 400_000,
})

export const setupFarm = async (
  provider: anchor.Provider,
  program: anchor.Program<Farm> | anchor.Program<typeof farmIdl>,
  plotCurrency: PublicKey,
  payer: PublicKey,
  plotPrice: anchor.BN = new anchor.BN(1000000),
): Promise<void> => {
  // const plotCurrency = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

  console.log('Loading plotly at :', program.programId.toString())
  try {
    const tx = await program.methods
      .initializeFarm(plotCurrency, plotPrice)
      .accounts({
        user: payer,
        plotCurrencyMint: plotCurrency,
      })
      .transaction()

    tx.add(modifyComputeUnits)

    await sendAndConfirmTransaction(provider.connection, tx, [(provider.wallet as anchor.Wallet).payer])

    console.log('Farm initialized')
  } catch (error) {
    console.error('Error farm setup:', error)
    throw error
  }
}
