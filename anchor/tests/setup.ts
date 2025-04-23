import * as anchor from '@coral-xyz/anchor'
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata'
import {
  createSignerFromKeypair,
  percentAmount,
  signerIdentity,
  PublicKey as umiPublicKey,
} from '@metaplex-foundation/umi'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Farm } from '../target/types/farm'

const convertToSigner = (wallet: anchor.Wallet): anchor.web3.Signer => ({
  publicKey: wallet.publicKey,
  secretKey: wallet.payer.secretKey,
})

export const setupMint = async (
  provider: anchor.Provider,
  tokenProgramId: PublicKey,
  tokenMintDecimals: number = 6,
): Promise<PublicKey> => {
  const umi = createUmi(provider.connection)

  const payer = provider.wallet as anchor.Wallet
  const keypair = fromWeb3JsKeypair(payer.payer)

  const umiSigner = createSignerFromKeypair(umi, keypair)

  umi.use(signerIdentity(umiSigner))

  const airdropSignature = await provider.connection.requestAirdrop(payer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
  await provider.connection.confirmTransaction(airdropSignature)

  const signer = convertToSigner(payer)

  const tokenMint = await createMint(
    provider.connection,
    signer,
    signer.publicKey,
    null,
    tokenMintDecimals,
    undefined,
    undefined,
    tokenProgramId,
  )

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

  const metadataArgs = {
    mint: tokenMint.toString() as umiPublicKey,
    mintAuthority: umi.identity,
    payer: umi.identity,
    updateAuthority: umi.identity,
    data: {
      name: 'Token',
      symbol: 'TKN',
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

  await mintTo(provider.connection, signer, tokenMint, ata.address, signer, 100_000_000)

  return tokenMint
}

const modifyComputeUnits = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
  units: 400_000,
})

export const setupFarm = async (
  provider: anchor.Provider,
  program: anchor.Program<Farm>,
  plotCurrency: PublicKey,
  payer: PublicKey,
): Promise<void> => {
  // const plotCurrency = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

  try {
    const tx = await program.methods
      .initializeFarm(plotCurrency)
      .accounts({
        user: payer,
      })
      .transaction()

    tx.add(modifyComputeUnits)

    await sendAndConfirmTransaction(provider.connection, tx, [(provider.wallet as anchor.Wallet).payer])
  } catch (error) {
    console.error('Error farm setup:', error)
    throw error
  }
}
