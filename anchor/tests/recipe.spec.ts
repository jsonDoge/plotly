import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { PublicKey } from '@solana/web3.js'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { createRecipe, toLeBytes } from './helpers'

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
})
