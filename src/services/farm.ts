/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-await-in-loop */
import { AnchorProvider, BN } from '@coral-xyz/anchor'
import { getFarmProgram, toLeBytes } from '@project/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()

export const getSurroundingPlotMintIxs = async (
  user: PublicKey,
  provider: AnchorProvider,
  plotX: number,
  plotY: number,
  plotCurrency: PublicKey,
): Promise<TransactionInstruction[]> => {
  const farmId = new PublicKey(publicRuntimeConfig.FARM_ID)
  const farm = getFarmProgram(provider)

  const instructions: TransactionInstruction[] = []

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      if (Math.abs(x) + Math.abs(y) !== 1) {
        continue
      }
      if (plotX + x < 0 || plotY + y < 0) {
        continue
      }
      if (plotX + x > 999 || plotY + y > 999) {
        continue
      }

      const neighborX = plotX + x
      const neighborY = plotY + y

      console.log('neighborX', neighborX)
      console.log('neighborY', neighborY)

      const [neighborPlotMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farmId.toBuffer()],
        farm.programId,
      )

      const [plotId] = PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        farm.programId,
      )

      let plot
      try {
        plot = await farm.account.plot.fetch(plotId)
      } catch (error) {
        if (error?.message?.includes('Account does not exist')) {
          // Account does not exist, which is expected for unminted plots
          plot = null
        } else {
          throw error
        }
      }

      if (!plot || plot.lastClaimer.equals(PublicKey.default)) {
        try {
          // eslint-disable-next-line no-await-in-loop
          instructions.push(
            // eslint-disable-next-line no-await-in-loop
            await farm.methods
              .mintPlot(neighborX, neighborY)
              .accounts({
                user,
                plotMint: neighborPlotMint,
                plotCurrencyMint: plotCurrency,
              })
              .instruction(),
          )
        } catch (error) {
          console.error('Error minting neighbor plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
          throw error
        }
      }
    }
  }
  return instructions
}

export const buyPlotTx = async (
  user: PublicKey,
  provider: AnchorProvider,
  plotX: number,
  plotY: number,
  plotCurrency: PublicKey,
) => {
  // NEED to check all neighboring plots that they should be minted

  const farmId = new PublicKey(publicRuntimeConfig.FARM_ID)
  const farm = getFarmProgram(provider)

  const instructions: TransactionInstruction[] = []

  console.log(plotCurrency.toString())

  // wallet.signIn

  const transaction = new Transaction()

  const [plotMintId] = PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farmId.toBuffer()],
    farm.programId,
  )

  instructions.forEach((instruction) => {
    transaction.add(instruction)
  })

  const [plotId] = PublicKey.findProgramAddressSync([Buffer.from('plot'), plotMintId.toBuffer()], farm.programId)

  const plotMintIds: PublicKey[] = []
  const plotIds: PublicKey[] = []
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      if (Math.abs(x) + Math.abs(y) !== 1) {
        continue
      }
      if (plotX + x < 0 || plotY + y < 0) {
        plotMintIds.push(PublicKey.default)
        plotIds.push(PublicKey.default)
        continue
      }
      if (plotX + x > 999 || plotY + y > 999) {
        plotMintIds.push(PublicKey.default)
        plotIds.push(PublicKey.default)
        continue
      }

      const neighborX = plotX + x
      const neighborY = plotY + y

      const [neighborPlotMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farmId.toBuffer()],
        farm.programId,
      )

      plotMintIds.push(neighborPlotMint)

      const [plotId_] = PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        farm.programId,
      )
      plotIds.push(plotId_)
    }
  }

  let plot
  try {
    plot = await farm.account.plot.fetch(plotId)
  } catch (error) {
    if (error?.message?.includes('Account does not exist')) {
      // Account does not exist, which is expected for unminted plots
      plot = null
    } else {
      throw error
    }
  }

  if (!plot || plot.lastClaimer.equals(PublicKey.default)) {
    transaction.add(
      await farm.methods
        .mintPlot(plotX, plotY)
        .accountsPartial({
          plotMint: plotMintId,
          user,
          plotCurrencyMint: plotCurrency,
        })
        .instruction(),
    )
  }

  transaction.add(
    await farm.methods
      .acquirePlot(plotX, plotY)
      .accountsPartial({
        plotCurrencyMint: plotCurrency,
        plotMint: plotMintId,
        user,
        plotLeft: plotIds[0],
        plotUp: plotIds[1],
        plotDown: plotIds[2],
        plotRight: plotIds[3],
      })
      .instruction(),
  )

  return transaction
}

export const getSurroundingPlotIds = (x: number, y: number, plotCurrencyId: PublicKey): PublicKey[] => {
  const surroundingPlotIds: PublicKey[] = []
  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 10) {
      if (i === 0 && j === 0) continue // Skip the center plot
      const surroundingX = x + i
      const surroundingY = y + j
      if (surroundingX >= 0 && surroundingY >= 0) {
        const [plotMintId] = PublicKey.findProgramAddressSync(
          [Buffer.from('plot_mint'), toLeBytes(surroundingX), toLeBytes(surroundingY), plotCurrencyId.toBuffer()],
          plotCurrencyId,
        )
        surroundingPlotIds.push(plotMintId)
      }
    }
  }
  return surroundingPlotIds
}

export const craftSeedTx = async (
  user: PublicKey,
  provider: AnchorProvider,
  seedsToMint: BN,
  plantTokensPerSeed: BN,
  growthBlockDuration: number,
  neighborCenterWaterRateRatio: number,
  balanceAbsorbRate: BN,
  timesToTend: number,
  plotCurrency: PublicKey,
  resultTokenMint: PublicKey,
): Promise<{ transaction: Transaction; seedMint: PublicKey }> => {
  // NEED to check all neighboring plots that they should be minted

  const farmId = new PublicKey(publicRuntimeConfig.FARM_ID)
  const farm = getFarmProgram(provider)

  console.log(plotCurrency.toString())

  const [userPlotCurrencyAta] = PublicKey.findProgramAddressSync(
    [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plotCurrency.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const [seedMint] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('seed_mint'),
      farmId.toBuffer(),
      resultTokenMint.toBuffer(),
      toLeBytes(BigInt(plantTokensPerSeed.toString()), 8),
      userPlotCurrencyAta.toBuffer(),
    ],
    farm.programId,
  )
  // wallet.signIn

  const transaction = new Transaction()

  transaction.add(
    await farm.methods
      .mintSeeds(
        plotCurrency,
        seedsToMint,
        plantTokensPerSeed,
        growthBlockDuration,
        neighborCenterWaterRateRatio,
        balanceAbsorbRate,
        timesToTend,
        userPlotCurrencyAta,
      )
      .accountsPartial({
        plotCurrencyMint: plotCurrency,
        user,
        plantMint: resultTokenMint,
        seedMint,
        farm: farmId,
      })
      .instruction(),
  )

  return { transaction, seedMint }
}

export const plantSeedTx = async (
  user: PublicKey,
  provider: AnchorProvider,
  plotX: number,
  plotY: number,
  plotCurrency: PublicKey,
  seedMint: PublicKey,
) => {
  // NEED to check all neighboring plots that they should be minted

  const farmId = new PublicKey(publicRuntimeConfig.FARM_ID)
  const farm = getFarmProgram(provider)

  const instructions: TransactionInstruction[] = []

  console.log(plotCurrency.toString())

  // wallet.signIn

  const transaction = new Transaction()

  const [plotMintId] = PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farmId.toBuffer()],
    farm.programId,
  )

  instructions.forEach((instruction) => {
    transaction.add(instruction)
  })

  const [plotId] = PublicKey.findProgramAddressSync([Buffer.from('plot'), plotMintId.toBuffer()], farm.programId)

  const plotMintIds: PublicKey[] = []
  const plotIds: PublicKey[] = []
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      if (Math.abs(x) + Math.abs(y) !== 1) {
        continue
      }
      if (plotX + x < 0 || plotY + y < 0) {
        plotMintIds.push(PublicKey.default)
        plotIds.push(PublicKey.default)
        continue
      }
      if (plotX + x > 999 || plotY + y > 999) {
        plotMintIds.push(PublicKey.default)
        plotIds.push(PublicKey.default)
        continue
      }

      const neighborX = plotX + x
      const neighborY = plotY + y

      const [neighborPlotMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farmId.toBuffer()],
        farm.programId,
      )

      plotMintIds.push(neighborPlotMint)

      const [plotId_] = PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        farm.programId,
      )
      plotIds.push(plotId_)
    }
  }

  let plot
  try {
    plot = await farm.account.plot.fetch(plotId)
  } catch (error) {
    if (error?.message?.includes('Account does not exist')) {
      // Account does not exist, which is expected for unminted plots
      plot = null
    } else {
      throw error
    }
  }

  if (!plot || plot.lastClaimer.equals(PublicKey.default)) {
    transaction.add(
      await farm.methods
        .mintPlot(plotX, plotY)
        .accountsPartial({
          plotMint: plotMintId,
          user,
          plotCurrencyMint: plotCurrency,
        })
        .instruction(),
    )
  }

  transaction.add(
    await farm.methods
      .plantSeed(plotX, plotY, plotCurrency)
      .accountsPartial({
        plotMint: plotMintId,
        seedMint,
        user,
        plotMintLeft: plotMintIds[0],
        plotMintUp: plotMintIds[1],
        plotMintDown: plotMintIds[2],
        plotMintRight: plotMintIds[3],
        plotLeft: plotIds[0],
        plotUp: plotIds[1],
        plotDown: plotIds[2],
        plotRight: plotIds[3],
      })
      .instruction(),
  )

  return transaction
}
