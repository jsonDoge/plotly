import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotent,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  transferChecked,
} from '@solana/spl-token'

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { createRecipe, followRecipe, toLeBytes } from './helpers'

describe('Recipe', () => {
  const provider = anchor.AnchorProvider.env()

  const userWallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Farm as anchor.Program<Farm>
  let plotCurrency: PublicKey

  beforeEach(async () => {
    plotCurrency = await setupMint(provider, TOKEN_PROGRAM_ID)
    await setupFarm(provider, program, plotCurrency, userWallet.publicKey)
  }, 10000000)

  it('Should create a recipe', async () => {
    const ingredient0 = await setupMint(provider, TOKEN_PROGRAM_ID)
    const ingredient1 = await setupMint(provider, TOKEN_PROGRAM_ID)
    const resultToken = await setupMint(provider, TOKEN_PROGRAM_ID)

    const resultTokenAta = await getAssociatedTokenAddress(resultToken, userWallet.publicKey)
    const ingredient0TokenAta = await getAssociatedTokenAddress(ingredient0, userWallet.publicKey)
    const ingredient1TokenAta = await getAssociatedTokenAddress(ingredient1, userWallet.publicKey)

    const farmAddress = PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )[0]

    const resultTokenAtaBalanceBefore = await program.provider.connection.getTokenAccountBalance(resultTokenAta)

    const [recipeId] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('recipe'),
        ingredient0.toBuffer(),
        toLeBytes(BigInt(new anchor.BN(2).toString()), 8),
        ingredient1.toBuffer(),
        toLeBytes(BigInt(new anchor.BN(4).toString()), 8),
        resultToken.toBuffer(),
        ingredient0TokenAta.toBuffer(),
        ingredient1TokenAta.toBuffer(),
        farmAddress.toBuffer(),
      ],
      program.programId,
    )

    console.log('creating recipe')
    await createRecipe(
      provider,
      program,
      plotCurrency,
      resultToken,
      ingredient0,
      ingredient1,
      new anchor.BN(2),
      new anchor.BN(4),
      new anchor.BN(100),
      userWallet,
      recipeId,
    )
    console.log('creating recipe created')

    const resultTokenAtaBalanceAfter = await program.provider.connection.getTokenAccountBalance(resultTokenAta)

    expect(resultTokenAtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(resultTokenAtaBalanceBefore.value.amount).subn(100).toString(),
    )

    const recipe = await program.account.recipe.fetch(recipeId)

    expect(recipe.ingredient0).toEqual(ingredient0)
    expect(recipe.ingredient1).toEqual(ingredient1)
    expect(recipe.resultToken).toEqual(resultToken)
    expect(recipe.ingredient0AmountPer1ResultToken.toString()).toEqual(new anchor.BN(2).toString())
    expect(recipe.ingredient1AmountPer1ResultToken.toString()).toEqual(new anchor.BN(4).toString())
    expect(recipe.resultTokenBalance.toString()).toEqual(new anchor.BN(100).toString())
  }, 1000000)

  it('Should create a recipe and follow recipe', async () => {
    const ingredient0 = await setupMint(provider, TOKEN_PROGRAM_ID)
    const ingredient1 = await setupMint(provider, TOKEN_PROGRAM_ID)
    const resultToken = await setupMint(provider, TOKEN_PROGRAM_ID)

    const resultTokenAta = await getAssociatedTokenAddress(resultToken, userWallet.publicKey)
    const ingredient0TokenAta = await getAssociatedTokenAddress(ingredient0, userWallet.publicKey)
    const ingredient1TokenAta = await getAssociatedTokenAddress(ingredient1, userWallet.publicKey)

    const farmAddress = PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )[0]

    const resultTokenAtaBalanceBefore = await program.provider.connection.getTokenAccountBalance(resultTokenAta)

    const [recipeId] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('recipe'),
        ingredient0.toBuffer(),
        toLeBytes(BigInt(new anchor.BN(2).toString()), 8),
        ingredient1.toBuffer(),
        toLeBytes(BigInt(new anchor.BN(4).toString()), 8),
        resultToken.toBuffer(),
        ingredient0TokenAta.toBuffer(),
        ingredient1TokenAta.toBuffer(),
        farmAddress.toBuffer(),
      ],
      program.programId,
    )

    console.log('creating recipe')
    await createRecipe(
      provider,
      program,
      plotCurrency,
      resultToken,
      ingredient0,
      ingredient1,
      new anchor.BN(2),
      new anchor.BN(4),
      new anchor.BN(100),
      userWallet,
      recipeId,
    )
    console.log('creating recipe created')

    const resultTokenAtaBalanceAfter = await program.provider.connection.getTokenAccountBalance(resultTokenAta)

    expect(resultTokenAtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(resultTokenAtaBalanceBefore.value.amount).subn(100).toString(),
    )

    const recipe = await program.account.recipe.fetch(recipeId)

    expect(recipe.ingredient0).toEqual(ingredient0)
    expect(recipe.ingredient1).toEqual(ingredient1)
    expect(recipe.resultToken).toEqual(resultToken)
    expect(recipe.ingredient0AmountPer1ResultToken.toString()).toEqual(new anchor.BN(2).toString())
    expect(recipe.ingredient1AmountPer1ResultToken.toString()).toEqual(new anchor.BN(4).toString())
    expect(recipe.resultTokenBalance.toString()).toEqual(new anchor.BN(100).toString())

    // Make different follower
    const newSigner = Keypair.generate()
    console.log('New signer pubkey:', newSigner.publicKey.toBase58())

    // Step 2: Airdrop SOL
    const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash()
    const airdropSig = await provider.connection.requestAirdrop(newSigner.publicKey, 2 * LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(
      { signature: airdropSig, blockhash, lastValidBlockHeight },
      'finalized',
    )

    // Create associated token accounts for the new signer
    const newSignerIngredient0Ata = await getAssociatedTokenAddress(ingredient0, newSigner.publicKey)
    const newSignerIngredient1Ata = await getAssociatedTokenAddress(ingredient1, newSigner.publicKey)
    const newSignerResultAta = await getAssociatedTokenAddress(resultToken, newSigner.publicKey)

    await createAssociatedTokenAccountIdempotent(
      program.provider.connection,
      userWallet.payer,
      ingredient0,
      newSigner.publicKey,
    )

    await createAssociatedTokenAccountIdempotent(
      program.provider.connection,
      userWallet.payer,
      ingredient1,
      newSigner.publicKey,
    )

    await createAssociatedTokenAccountIdempotent(
      program.provider.connection,
      userWallet.payer,
      resultToken,
      newSigner.publicKey,
    )

    // Transfer tokens from userWallet to newSigner
    await transferChecked(
      program.provider.connection,
      userWallet.payer,
      ingredient0TokenAta,
      ingredient0,
      newSignerIngredient0Ata,
      userWallet.publicKey,
      200,
      6,
    )

    await transferChecked(
      program.provider.connection,
      userWallet.payer,
      ingredient1TokenAta,
      ingredient1,
      newSignerIngredient1Ata,
      userWallet.publicKey,
      200,
      6,
    )

    const ing0AtaBalanceBefore = await program.provider.connection.getTokenAccountBalance(ingredient0TokenAta)
    const ing1AtaBalanceBefore = await program.provider.connection.getTokenAccountBalance(ingredient1TokenAta)

    const followerIng0AtaBalanceBefore =
      await program.provider.connection.getTokenAccountBalance(newSignerIngredient0Ata)
    const followerIng1AtaBalanceBefore =
      await program.provider.connection.getTokenAccountBalance(newSignerIngredient1Ata)
    const resultAtaBalanceBefore = await program.provider.connection.getTokenAccountBalance(newSignerResultAta)

    await followRecipe(
      provider,
      program,
      plotCurrency,
      resultToken,
      ingredient0,
      ingredient1,
      new anchor.BN(2),
      new anchor.BN(4),
      new anchor.BN(1), // receive 1 result token
      new anchor.Wallet(newSigner),
      recipeId,
      recipe.ingredient0Treasury,
      recipe.ingredient1Treasury,
    )
    const ing0AtaBalanceAfter = await program.provider.connection.getTokenAccountBalance(ingredient0TokenAta)
    const ing1AtaBalanceAfter = await program.provider.connection.getTokenAccountBalance(ingredient1TokenAta)

    const followerIng0AtaBalanceAfter =
      await program.provider.connection.getTokenAccountBalance(newSignerIngredient0Ata)
    const followerIng1AtaBalanceAfter =
      await program.provider.connection.getTokenAccountBalance(newSignerIngredient1Ata)
    const resultAtaBalanceAfter = await program.provider.connection.getTokenAccountBalance(newSignerResultAta)

    // owner wallet receives a few tokens back
    expect(ing0AtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(ing0AtaBalanceBefore.value.amount).addn(2).toString(),
    )
    expect(ing1AtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(ing1AtaBalanceBefore.value.amount).addn(4).toString(),
    )

    // follower
    expect(followerIng0AtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(followerIng0AtaBalanceBefore.value.amount).subn(2).toString(),
    )
    expect(followerIng1AtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(followerIng1AtaBalanceBefore.value.amount).subn(4).toString(),
    )
    expect(resultAtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(resultAtaBalanceBefore.value.amount).addn(1).toString(),
    )

    const resultTokenAtaBalanceAfterFollow = await program.provider.connection.getTokenAccountBalance(resultTokenAta)

    // owner should not gain any result tokens
    expect(resultTokenAtaBalanceAfterFollow.value.amount).toEqual(
      new anchor.BN(resultTokenAtaBalanceAfter.value.amount).toString(),
    )

    const recipeAfter = await program.account.recipe.fetch(recipeId)

    expect(recipeAfter.ingredient0).toEqual(ingredient0)
    expect(recipeAfter.ingredient1).toEqual(ingredient1)
    expect(recipeAfter.resultToken).toEqual(resultToken)
    expect(recipeAfter.ingredient0AmountPer1ResultToken.toString()).toEqual(new anchor.BN(2).toString())
    expect(recipeAfter.ingredient1AmountPer1ResultToken.toString()).toEqual(new anchor.BN(4).toString())
    expect(recipeAfter.resultTokenBalance.toString()).toEqual(new anchor.BN(99).toString())
  }, 1000000)
})
