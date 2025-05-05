import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { PublicKey } from '@solana/web3.js'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { createOffer, mintSeeds, toLeBytes } from './helpers'

describe('Offer', () => {
  const provider = anchor.AnchorProvider.env()

  const userWallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Farm as anchor.Program<Farm>
  let plotCurrency: PublicKey

  beforeEach(async () => {
    plotCurrency = await setupMint(provider, TOKEN_PROGRAM_ID)
    await setupFarm(provider, program, plotCurrency, userWallet.publicKey)
  }, 10000000)

  it('Should fail creating an offer with non-seed (no metadata)', async () => {
    const resultToken = await setupMint(provider, TOKEN_PROGRAM_ID)

    const userPlotCurrencyAta = await getAssociatedTokenAddress(plotCurrency, userWallet.publicKey)

    const farmAddress = PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )[0]

    const [offerId] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('offer'),
        toLeBytes(BigInt(new anchor.BN(20).toString()), 8),
        resultToken.toBuffer(),
        userPlotCurrencyAta.toBuffer(),
        farmAddress.toBuffer(),
      ],
      program.programId,
    )

    let txFailed = false
    try {
      await createOffer(
        provider,
        program,
        plotCurrency,
        resultToken,
        new anchor.BN(20),
        new anchor.BN(100),
        userWallet,
        offerId,
      )
    } catch (e) {
      txFailed = true
    }
    expect(txFailed).toBe(true)
  }, 1000000)

  it('Should create an offer with seed', async () => {
    const resultToken = await setupMint(provider, TOKEN_PROGRAM_ID)

    const userPlotCurrencyAta = await getAssociatedTokenAddress(plotCurrency, userWallet.publicKey)

    const farmAddress = PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )[0]

    const seedsToMint = 200
    const plantTokensPerSeed = 1
    const growthBlockDuration = 101
    const waterDrainRate = 10
    const timesToTend = 1
    const balanceAbsorbRate = 2

    const seedMint = await mintSeeds(
      provider,
      program,
      plotCurrency,
      resultToken,
      userWallet,
      seedsToMint,
      plantTokensPerSeed,
      growthBlockDuration,
      waterDrainRate,
      timesToTend,
      balanceAbsorbRate,
    )

    const seedTokenAta = await getAssociatedTokenAddress(seedMint, userWallet.publicKey)
    const seedTokenAtaBalanceBefore = await program.provider.connection.getTokenAccountBalance(seedTokenAta)

    const [offerId] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('offer'),
        toLeBytes(BigInt(new anchor.BN(20).toString()), 8),
        seedMint.toBuffer(),
        userPlotCurrencyAta.toBuffer(),
        farmAddress.toBuffer(),
      ],
      program.programId,
    )

    console.log('creating offer')
    await createOffer(
      provider,
      program,
      plotCurrency,
      seedMint,
      new anchor.BN(20),
      new anchor.BN(100),
      userWallet,
      offerId,
    )
    console.log('creating offer created')

    const seedTokenAtaBalanceAfter = await program.provider.connection.getTokenAccountBalance(seedTokenAta)

    expect(seedTokenAtaBalanceAfter.value.amount).toEqual(
      new anchor.BN(seedTokenAtaBalanceBefore.value.amount).subn(100).toString(),
    )

    const offer = await program.account.offer.fetch(offerId)

    expect(offer.resultToken).toEqual(seedMint)
    expect(offer.resultTokenBalance.toString()).toEqual(new anchor.BN(100).toString())
  }, 1000000)
})
