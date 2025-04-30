import * as anchor from '@coral-xyz/anchor'
// import { SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { fetchDigitalAsset, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { PublicKey as umiPublicKey, some } from '@metaplex-foundation/umi'

import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import assert from 'node:assert'
import { Farm } from '../target/types/farm'
import { setupFarm, setupMint } from './setup'
import { mintAndBuyPlot, mintSeeds, plantSeed, toLeBytes } from './helpers'

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
})
