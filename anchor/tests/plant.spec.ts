/* eslint-disable no-await-in-loop */
import * as anchor from '@coral-xyz/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'

import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import assert from 'node:assert'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import {
  harvestPlant,
  mintAndBuyPlot,
  mintSeeds,
  plantSeed,
  revertPlant,
  tendPlant,
  toLeBytes,
  waitForSlots,
} from './helpers'

// equivalent to rust to_le_bytes

const modifyComputeUnits = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
  units: 400_000,
})

const increasedCUTxWrap = (connection: Connection, payer: Keypair) => async (rawTx: any) => {
  const tx = await rawTx.transaction()
  tx.add(modifyComputeUnits)
  return sendAndConfirmTransaction(connection, tx, [payer])
}

const getSurroundingPlotIds = async (
  x: number,
  y: number,
  farmId: PublicKey,
  programId: PublicKey,
): Promise<(PublicKey | null)[]> => {
  const surroundingPlotIds: (PublicKey | null)[] = []
  if (y > 0) {
    const [plotMintUp] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(x), toLeBytes(y - 1), farmId.toBuffer()],
      programId,
    )

    const [plotUpId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMintUp.toBuffer()],
      programId,
    )
    surroundingPlotIds.push(plotUpId)
  } else {
    surroundingPlotIds.push(null)
  }
  if (y < 999) {
    const [plotMintDown] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(x), toLeBytes(y + 1), farmId.toBuffer()],
      programId,
    )

    const [plotDownId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMintDown.toBuffer()],
      programId,
    )
    surroundingPlotIds.push(plotDownId)
  } else {
    surroundingPlotIds.push(null)
  }
  if (x > 0) {
    const [plotMintLeft] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(x - 1), toLeBytes(y), farmId.toBuffer()],
      programId,
    )

    const [plotLeftId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMintLeft.toBuffer()],
      programId,
    )
    surroundingPlotIds.push(plotLeftId)
  } else {
    surroundingPlotIds.push(null)
  }
  if (x < 999) {
    const [plotMintRight] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(x + 1), toLeBytes(y), farmId.toBuffer()],
      programId,
    )

    const [plotRightId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMintRight.toBuffer()],
      programId,
    )
    surroundingPlotIds.push(plotRightId)
  }
  return surroundingPlotIds
}

describe('Planting', () => {
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

  it('Should plant a seed and then harvest it', async () => {
    console.log('Running plant seed test')
    const plotX = 1
    const plotY = 1

    console.log('minting plots and buying')
    await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 1000
    const waterDrainRate = 10
    const timesToTend = 5
    const balanceAbsorbRate = 2

    console.log('setting up plant mint')
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)

    console.log('creating seed')

    const seedMint = await mintSeeds(
      provider,
      program,
      plotCurrency,
      plantMint,
      userWallet,
      seedsToMint,
      plantTokensPerSeed,
      growthBlockDuration,
      waterDrainRate,
      timesToTend,
      balanceAbsorbRate,
    )

    console.log('planting seed')

    await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)
    const totalWaterRate = 100 // constant for now

    const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )

    const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
      program.programId,
    )

    const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMint.toBuffer()],
      program.programId,
    )

    const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plant'), plotMint.toBuffer()],
      program.programId,
    )

    const plantData = await program.account.plant.fetch(plantId)
    console.log('Plant account data:', plantData)

    assert(plantData.seedMint.equals(seedMint), 'plant seed mint matches')
    expect(plantData.waterRequired).toEqual(totalWaterRate * growthBlockDuration)
    assert(
      plantData.balanceAbsorbRate.toString() === new anchor.BN(balanceAbsorbRate).toString(),
      'balance absorb rate matches',
    )
    assert(plantData.water.toString() === new anchor.BN(0).toString(), 'Initial water is 0')
    assert(plantData.balance.toString() === new anchor.BN(0).toString(), 'Initial balance is 0')
    assert(
      plantData.balanceRequired.toString() === new anchor.BN(balanceAbsorbRate * growthBlockDuration).toString(),
      'Initial balance is 0',
    )

    // up/down/left/right
    const surroundingPlotIds = await getSurroundingPlotIds(plotX, plotY, farm, program.programId)

    const centerPlotData = await program.account.plot.fetch(plotId)
    expect(centerPlotData.centerPlantDrainRate).toEqual(100 - plantData.neighborWaterDrainRate * 4)
    expect(centerPlotData.upPlantDrainRate).toEqual(0)
    expect(centerPlotData.downPlantDrainRate).toEqual(0)
    expect(centerPlotData.leftPlantDrainRate).toEqual(0)
    expect(centerPlotData.rightPlantDrainRate).toEqual(0)

    if (surroundingPlotIds[0]) {
      const upPlotData = await program.account.plot.fetch(surroundingPlotIds[0])
      expect(upPlotData.centerPlantDrainRate).toEqual(0)
      expect(upPlotData.upPlantDrainRate).toEqual(0)
      expect(upPlotData.downPlantDrainRate).toEqual(plantData.neighborWaterDrainRate)
      expect(upPlotData.leftPlantDrainRate).toEqual(0)
      expect(upPlotData.rightPlantDrainRate).toEqual(0)
    }

    if (surroundingPlotIds[1]) {
      const downPlotData = await program.account.plot.fetch(surroundingPlotIds[1])
      expect(downPlotData.centerPlantDrainRate).toEqual(0)
      expect(downPlotData.upPlantDrainRate).toEqual(plantData.neighborWaterDrainRate)
      expect(downPlotData.downPlantDrainRate).toEqual(0)
      expect(downPlotData.leftPlantDrainRate).toEqual(0)
      expect(downPlotData.rightPlantDrainRate).toEqual(0)
    }
    if (surroundingPlotIds[2]) {
      const leftPlotData = await program.account.plot.fetch(surroundingPlotIds[2])
      expect(leftPlotData.centerPlantDrainRate).toEqual(0)
      expect(leftPlotData.upPlantDrainRate).toEqual(0)
      expect(leftPlotData.downPlantDrainRate).toEqual(0)
      expect(leftPlotData.leftPlantDrainRate).toEqual(0)
      expect(leftPlotData.rightPlantDrainRate).toEqual(plantData.neighborWaterDrainRate)
    }
    if (surroundingPlotIds[3]) {
      const rightPlotData = await program.account.plot.fetch(surroundingPlotIds[3])
      expect(rightPlotData.centerPlantDrainRate).toEqual(0)
      expect(rightPlotData.upPlantDrainRate).toEqual(0)
      expect(rightPlotData.downPlantDrainRate).toEqual(0)
      expect(rightPlotData.leftPlantDrainRate).toEqual(plantData.neighborWaterDrainRate)
      expect(rightPlotData.rightPlantDrainRate).toEqual(0)
    }
  }, 1000000)

  it('Should plant a seed and be able to tend it', async () => {
    console.log('Running plant seed test')
    const plotX = 1
    const plotY = 1

    console.log('minting plots and buying')
    await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 101
    const waterDrainRate = 10
    const timesToTend = 5
    const balanceAbsorbRate = 2

    console.log('setting up plant mint')
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)

    console.log('creating seed')

    const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('farm'), plotCurrency.toBuffer()],
      program.programId,
    )

    const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
      program.programId,
    )

    const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMint.toBuffer()],
      program.programId,
    )

    let plotData = await program.account.plot.fetch(plotId)
    const plotBalanceBefore = plotData.balance

    const seedMint = await mintSeeds(
      provider,
      program,
      plotCurrency,
      plantMint,
      userWallet,
      seedsToMint,
      plantTokensPerSeed,
      growthBlockDuration,
      waterDrainRate,
      timesToTend,
      balanceAbsorbRate,
    )
    console.log('planting seed')

    await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

    const currentSlot = await provider.connection.getSlot()
    await waitForSlots(provider, currentSlot, 17)

    console.log('tending plant')

    await tendPlant(provider, program, plotX, plotY, plotCurrency, userWallet)

    const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plant'), plotMint.toBuffer()],
      program.programId,
    )

    const plantData = await program.account.plant.fetch(plantId)
    plotData = await program.account.plot.fetch(plotId)

    expect(plantData.balance.toNumber()).toBeGreaterThan(0)
    expect(plotData.balance.toString()).toEqual(plotBalanceBefore.sub(plantData.balance).toString())
  }, 1000000)

  it('Should plant a seed -> tend once -> harvest it', async () => {
    console.log('Running plant seed test')
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

    const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMint.toBuffer()],
      program.programId,
    )

    const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plant'), plotMint.toBuffer()],
      program.programId,
    )

    console.log('minting plots and buying')
    await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 101
    const waterDrainRate = 10
    const timesToTend = 1
    const balanceAbsorbRate = 2

    console.log('setting up plant mint')
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)

    console.log('creating seed')

    const seedMint = await mintSeeds(
      provider,
      program,
      plotCurrency,
      plantMint,
      userWallet,
      seedsToMint,
      plantTokensPerSeed,
      growthBlockDuration,
      waterDrainRate,
      timesToTend,
      balanceAbsorbRate,
    )

    const [seedInfoId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('seed_mint_info'), seedMint.toBuffer()],
      program.programId,
    )
    const seedInfo = await program.account.seedMintInfo.fetch(seedInfoId)
    const plantTokenMintId = seedInfo.plantMint

    const [userPlantTokenAta] = anchor.web3.PublicKey.findProgramAddressSync(
      [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plantTokenMintId.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    console.log('planting seed')

    const plantSlot = await provider.connection.getSlot()

    await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)
    const totalWaterRate = 100 // constant for now

    await waitForSlots(provider, await provider.connection.getSlot(), 45) // should allow tending 25% within tending threashold (half of growth block duration)
    console.log('tending plant')

    const [userPlotCurrencyTokenAta] = anchor.web3.PublicKey.findProgramAddressSync(
      [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plotCurrency.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const plotCurrencyBalanceBeforeTend = await provider.connection.getTokenAccountBalance(userPlotCurrencyTokenAta)

    await tendPlant(provider, program, plotX, plotY, plotCurrency, userWallet)

    const plotCurrencyBalanceAfterTend = await provider.connection.getTokenAccountBalance(userPlotCurrencyTokenAta)

    expect(Number(plotCurrencyBalanceBeforeTend.value.amount)).toBeLessThan(
      Number(plotCurrencyBalanceAfterTend.value.amount),
    )

    await waitForSlots(provider, await provider.connection.getSlot(), 56) // total growth time is 101, so we need to wait for 45 + 56 = 101
    console.log('harvesting plant')

    const harvestSlot = await provider.connection.getSlot()

    console.log('plant slot:', plantSlot)
    console.log('harvest slot:', harvestSlot)

    let userPlantTokenAtaData = await getAccount(provider.connection, userPlantTokenAta)
    const balanceBeforeHarvest = userPlantTokenAtaData.amount

    await harvestPlant(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

    const plotCurrencyBalanceAfterHarvest = await provider.connection.getTokenAccountBalance(userPlotCurrencyTokenAta)

    expect(Number(plotCurrencyBalanceAfterTend.value.amount)).toBeLessThan(
      Number(plotCurrencyBalanceAfterHarvest.value.amount),
    )

    console.log('fetching addresses')

    const plantData = await program.account.plant.fetch(plantId)

    // reset plant data
    expect(plantData.seedMint).toEqual(PublicKey.default)
    expect(plantData.waterRequired).toEqual(0)
    expect(plantData.balanceAbsorbRate.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.water.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.balance.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.balanceRequired.toString()).toEqual(new anchor.BN(0).toString())

    userPlantTokenAtaData = await getAccount(provider.connection, userPlantTokenAta)
    const balanceAfterHarvest = userPlantTokenAtaData.amount

    console.log('seed info', seedInfo)

    // user received expected plant tokens
    expect(new anchor.BN((balanceAfterHarvest - balanceBeforeHarvest).toString()).toString()).toEqual(
      seedInfo.plantTokensPerSeed.toString(),
    )

    // up/down/left/right
    const surroundingPlotIds = await getSurroundingPlotIds(plotX, plotY, farm, program.programId)

    const centerPlotData = await program.account.plot.fetch(plotId)
    expect(centerPlotData.centerPlantDrainRate).toEqual(0)
    expect(centerPlotData.upPlantDrainRate).toEqual(0)
    expect(centerPlotData.downPlantDrainRate).toEqual(0)
    expect(centerPlotData.leftPlantDrainRate).toEqual(0)
    expect(centerPlotData.rightPlantDrainRate).toEqual(0)

    if (surroundingPlotIds[0]) {
      const upPlotData = await program.account.plot.fetch(surroundingPlotIds[0])
      expect(upPlotData.centerPlantDrainRate).toEqual(0)
      expect(upPlotData.upPlantDrainRate).toEqual(0)
      expect(upPlotData.downPlantDrainRate).toEqual(0)
      expect(upPlotData.leftPlantDrainRate).toEqual(0)
      expect(upPlotData.rightPlantDrainRate).toEqual(0)
    }

    if (surroundingPlotIds[1]) {
      const downPlotData = await program.account.plot.fetch(surroundingPlotIds[1])
      expect(downPlotData.centerPlantDrainRate).toEqual(0)
      expect(downPlotData.upPlantDrainRate).toEqual(0)
      expect(downPlotData.downPlantDrainRate).toEqual(0)
      expect(downPlotData.leftPlantDrainRate).toEqual(0)
      expect(downPlotData.rightPlantDrainRate).toEqual(0)
    }
    if (surroundingPlotIds[2]) {
      const leftPlotData = await program.account.plot.fetch(surroundingPlotIds[2])
      expect(leftPlotData.centerPlantDrainRate).toEqual(0)
      expect(leftPlotData.upPlantDrainRate).toEqual(0)
      expect(leftPlotData.downPlantDrainRate).toEqual(0)
      expect(leftPlotData.leftPlantDrainRate).toEqual(0)
      expect(leftPlotData.rightPlantDrainRate).toEqual(0)
    }
    if (surroundingPlotIds[3]) {
      const rightPlotData = await program.account.plot.fetch(surroundingPlotIds[3])
      expect(rightPlotData.centerPlantDrainRate).toEqual(0)
      expect(rightPlotData.upPlantDrainRate).toEqual(0)
      expect(rightPlotData.downPlantDrainRate).toEqual(0)
      expect(rightPlotData.leftPlantDrainRate).toEqual(0)
      expect(rightPlotData.rightPlantDrainRate).toEqual(0)
    }
  }, 1000000)

  it('Should plant a seed (non-tendable,balance absorb rate = 0) -> harvest it', async () => {
    console.log('Running plant seed test')
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

    const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMint.toBuffer()],
      program.programId,
    )

    const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plant'), plotMint.toBuffer()],
      program.programId,
    )

    console.log('minting plots and buying')
    await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 101
    const waterDrainRate = 10
    const timesToTend = 0
    const balanceAbsorbRate = 0

    console.log('setting up plant mint')
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)

    console.log('creating seed')

    const seedMint = await mintSeeds(
      provider,
      program,
      plotCurrency,
      plantMint,
      userWallet,
      seedsToMint,
      plantTokensPerSeed,
      growthBlockDuration,
      waterDrainRate,
      timesToTend,
      balanceAbsorbRate,
    )

    const [seedInfoId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('seed_mint_info'), seedMint.toBuffer()],
      program.programId,
    )
    const seedInfo = await program.account.seedMintInfo.fetch(seedInfoId)
    const plantTokenMintId = seedInfo.plantMint

    const [userPlantTokenAta] = anchor.web3.PublicKey.findProgramAddressSync(
      [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plantTokenMintId.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const [userPlotCurrencyTokenAta] = anchor.web3.PublicKey.findProgramAddressSync(
      [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plotCurrency.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    const plotCurrencyBalanceBefore = await provider.connection.getTokenAccountBalance(userPlotCurrencyTokenAta)

    console.log('planting seed')

    const plantSlot = await provider.connection.getSlot()

    await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

    await waitForSlots(provider, await provider.connection.getSlot(), 101) // total growth time is 101, so we need to wait for 45 + 56 = 101
    console.log('harvesting plant')

    const harvestSlot = await provider.connection.getSlot()

    console.log('plant slot:', plantSlot)
    console.log('harvest slot:', harvestSlot)

    let userPlantTokenAtaData = await getAccount(provider.connection, userPlantTokenAta)
    const balanceBeforeHarvest = userPlantTokenAtaData.amount

    await harvestPlant(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

    console.log('fetching addresses')
    const plotCurrencyBalanceAfter = await provider.connection.getTokenAccountBalance(userPlotCurrencyTokenAta)

    // user is the creator and should not receive any plot currency (due to 0 absorb rate)
    expect(plotCurrencyBalanceAfter.value.amount).toEqual(plotCurrencyBalanceBefore.value.amount)

    const plantData = await program.account.plant.fetch(plantId)

    // reset plant data
    expect(plantData.seedMint).toEqual(PublicKey.default)
    expect(plantData.waterRequired).toEqual(0)
    expect(plantData.balanceAbsorbRate.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.water.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.balance.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.balanceRequired.toString()).toEqual(new anchor.BN(0).toString())

    userPlantTokenAtaData = await getAccount(provider.connection, userPlantTokenAta)
    const balanceAfterHarvest = userPlantTokenAtaData.amount

    console.log('seed info', seedInfo)

    // user received expected plant tokens
    expect(new anchor.BN((balanceAfterHarvest - balanceBeforeHarvest).toString()).toString()).toEqual(
      seedInfo.plantTokensPerSeed.toString(),
    )

    // up/down/left/right
    const surroundingPlotIds = await getSurroundingPlotIds(plotX, plotY, farm, program.programId)

    const centerPlotData = await program.account.plot.fetch(plotId)
    expect(centerPlotData.centerPlantDrainRate).toEqual(0)
    expect(centerPlotData.upPlantDrainRate).toEqual(0)
    expect(centerPlotData.downPlantDrainRate).toEqual(0)
    expect(centerPlotData.leftPlantDrainRate).toEqual(0)
    expect(centerPlotData.rightPlantDrainRate).toEqual(0)

    if (surroundingPlotIds[0]) {
      const upPlotData = await program.account.plot.fetch(surroundingPlotIds[0])
      expect(upPlotData.centerPlantDrainRate).toEqual(0)
      expect(upPlotData.upPlantDrainRate).toEqual(0)
      expect(upPlotData.downPlantDrainRate).toEqual(0)
      expect(upPlotData.leftPlantDrainRate).toEqual(0)
      expect(upPlotData.rightPlantDrainRate).toEqual(0)
    }

    if (surroundingPlotIds[1]) {
      const downPlotData = await program.account.plot.fetch(surroundingPlotIds[1])
      expect(downPlotData.centerPlantDrainRate).toEqual(0)
      expect(downPlotData.upPlantDrainRate).toEqual(0)
      expect(downPlotData.downPlantDrainRate).toEqual(0)
      expect(downPlotData.leftPlantDrainRate).toEqual(0)
      expect(downPlotData.rightPlantDrainRate).toEqual(0)
    }
    if (surroundingPlotIds[2]) {
      const leftPlotData = await program.account.plot.fetch(surroundingPlotIds[2])
      expect(leftPlotData.centerPlantDrainRate).toEqual(0)
      expect(leftPlotData.upPlantDrainRate).toEqual(0)
      expect(leftPlotData.downPlantDrainRate).toEqual(0)
      expect(leftPlotData.leftPlantDrainRate).toEqual(0)
      expect(leftPlotData.rightPlantDrainRate).toEqual(0)
    }
    if (surroundingPlotIds[3]) {
      const rightPlotData = await program.account.plot.fetch(surroundingPlotIds[3])
      expect(rightPlotData.centerPlantDrainRate).toEqual(0)
      expect(rightPlotData.upPlantDrainRate).toEqual(0)
      expect(rightPlotData.downPlantDrainRate).toEqual(0)
      expect(rightPlotData.leftPlantDrainRate).toEqual(0)
      expect(rightPlotData.rightPlantDrainRate).toEqual(0)
    }
  }, 1000000)

  it('Should plant a seed -> tend once -> revert plant ', async () => {
    console.log('Running plant seed test')
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

    const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plot'), plotMint.toBuffer()],
      program.programId,
    )

    const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('plant'), plotMint.toBuffer()],
      program.programId,
    )

    console.log('minting plots and buying')
    await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)

    const seedsToMint = 5
    const plantTokensPerSeed = 10000000
    const growthBlockDuration = 101
    const waterDrainRate = 10
    const timesToTend = 1
    const balanceAbsorbRate = 2

    console.log('setting up plant mint')
    const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)

    console.log('creating seed')

    const seedMint = await mintSeeds(
      provider,
      program,
      plotCurrency,
      plantMint,
      userWallet,
      seedsToMint,
      plantTokensPerSeed,
      growthBlockDuration,
      waterDrainRate,
      timesToTend,
      balanceAbsorbRate,
    )

    const [seedInfoId] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('seed_mint_info'), seedMint.toBuffer()],
      program.programId,
    )
    const seedInfo = await program.account.seedMintInfo.fetch(seedInfoId)
    const plantTokenMintId = seedInfo.plantMint

    const [userPlantTokenAta] = anchor.web3.PublicKey.findProgramAddressSync(
      [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plantTokenMintId.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    // TODO: check if treasury gets the plot currency
    // const [plantTreasuryAta] = anchor.web3.PublicKey.findProgramAddressSync(
    //   [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plotCurrency.toBuffer()],
    //   ASSOCIATED_TOKEN_PROGRAM_ID,
    // )

    const [userSeedAta] = anchor.web3.PublicKey.findProgramAddressSync(
      [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), seedMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    console.log('planting seed')

    const plantSlot = await provider.connection.getSlot()

    await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

    await waitForSlots(provider, await provider.connection.getSlot(), 45) // should allow tending 25% within tending threashold (half of growth block duration)
    console.log('tending plant')

    await tendPlant(provider, program, plotX, plotY, plotCurrency, userWallet)

    // await waitForSlots(provider, await provider.connection.getSlot(), 56) // total growth time is 101, so we need to wait for 45 + 56 = 101
    console.log('reverting plant')

    const revertPlantSlot = await provider.connection.getSlot()

    console.log('plant slot:', plantSlot)
    console.log('revert slot:', revertPlantSlot)

    let userPlantTokenAtaData = await getAccount(provider.connection, userPlantTokenAta)
    const balanceBeforeRevert = userPlantTokenAtaData.amount
    let userSeedAtaData = await getAccount(provider.connection, userSeedAta)
    const seedsBeforeRevert = userSeedAtaData.amount

    await revertPlant(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)

    userPlantTokenAtaData = await getAccount(provider.connection, userPlantTokenAta)
    const balanceAfterRevert = userPlantTokenAtaData.amount
    userSeedAtaData = await getAccount(provider.connection, userSeedAta)
    const seedsAfterRevert = userSeedAtaData.amount

    // user should NOT receive any plant tokens
    expect(new anchor.BN((balanceBeforeRevert - balanceAfterRevert).toString()).toString()).toEqual(
      new anchor.BN(0).toString(),
    )

    // should receive back one seed
    expect(new anchor.BN((seedsAfterRevert - seedsBeforeRevert).toString()).toString()).toEqual(
      new anchor.BN(1).toString(),
    )

    const plantData = await program.account.plant.fetch(plantId)

    // reset plant data
    expect(plantData.seedMint).toEqual(PublicKey.default)
    expect(plantData.waterRequired).toEqual(0)
    expect(plantData.balanceAbsorbRate.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.water.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.balance.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.balanceRequired.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.timesTended.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.timesToTend.toString()).toEqual(new anchor.BN(0).toString())
    expect(plantData.treasury).toEqual(PublicKey.default)
    expect(plantData.treasuryReceivedBalance.toString()).toEqual(new anchor.BN(0).toString())

    // up/down/left/right
    const surroundingPlotIds = await getSurroundingPlotIds(plotX, plotY, farm, program.programId)

    const centerPlotData = await program.account.plot.fetch(plotId)
    expect(centerPlotData.centerPlantDrainRate).toEqual(0)
    expect(centerPlotData.upPlantDrainRate).toEqual(0)
    expect(centerPlotData.downPlantDrainRate).toEqual(0)
    expect(centerPlotData.leftPlantDrainRate).toEqual(0)
    expect(centerPlotData.rightPlantDrainRate).toEqual(0)

    if (surroundingPlotIds[0]) {
      const upPlotData = await program.account.plot.fetch(surroundingPlotIds[0])
      expect(upPlotData.centerPlantDrainRate).toEqual(0)
      expect(upPlotData.upPlantDrainRate).toEqual(0)
      expect(upPlotData.downPlantDrainRate).toEqual(0)
      expect(upPlotData.leftPlantDrainRate).toEqual(0)
      expect(upPlotData.rightPlantDrainRate).toEqual(0)
    }

    if (surroundingPlotIds[1]) {
      const downPlotData = await program.account.plot.fetch(surroundingPlotIds[1])
      expect(downPlotData.centerPlantDrainRate).toEqual(0)
      expect(downPlotData.upPlantDrainRate).toEqual(0)
      expect(downPlotData.downPlantDrainRate).toEqual(0)
      expect(downPlotData.leftPlantDrainRate).toEqual(0)
      expect(downPlotData.rightPlantDrainRate).toEqual(0)
    }
    if (surroundingPlotIds[2]) {
      const leftPlotData = await program.account.plot.fetch(surroundingPlotIds[2])
      expect(leftPlotData.centerPlantDrainRate).toEqual(0)
      expect(leftPlotData.upPlantDrainRate).toEqual(0)
      expect(leftPlotData.downPlantDrainRate).toEqual(0)
      expect(leftPlotData.leftPlantDrainRate).toEqual(0)
      expect(leftPlotData.rightPlantDrainRate).toEqual(0)
    }
    if (surroundingPlotIds[3]) {
      const rightPlotData = await program.account.plot.fetch(surroundingPlotIds[3])
      expect(rightPlotData.centerPlantDrainRate).toEqual(0)
      expect(rightPlotData.upPlantDrainRate).toEqual(0)
      expect(rightPlotData.downPlantDrainRate).toEqual(0)
      expect(rightPlotData.leftPlantDrainRate).toEqual(0)
      expect(rightPlotData.rightPlantDrainRate).toEqual(0)
    }
  }, 1000000)
})
