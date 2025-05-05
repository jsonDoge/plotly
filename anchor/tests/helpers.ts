import * as anchor from '@coral-xyz/anchor'
import { Farm } from '@project/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
// import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'

const farmIdl = require('../target/idl/farm.json') as Farm

export function toLeBytes(value: number | bigint, byteLength = 4, signed = false) {
  const buffer = Buffer.alloc(byteLength)

  let newVal: any = value

  switch (byteLength) {
    case 1:
      if (typeof value !== 'number') {
        newVal = Number(value)
      }
      buffer.writeUInt8(newVal, 0)
      break
    case 2:
      if (typeof value !== 'number') {
        newVal = Number(value)
      }
      if (signed) {
        buffer.writeInt16LE(newVal, 0)
      } else {
        buffer.writeUInt16LE(newVal, 0)
      }
      break
    case 4:
      if (typeof value !== 'number') {
        newVal = Number(value)
      }
      if (signed) {
        buffer.writeInt32LE(newVal, 0)
      } else {
        buffer.writeUInt32LE(newVal, 0)
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

export const increasedCUTxWrap = (connection: Connection, payer: Keypair) => async (rawTx: any) => {
  const tx = await rawTx.transaction()
  tx.add(modifyComputeUnits)
  return sendAndConfirmTransaction(connection, tx, [payer])
}

export const mintAndBuyPlot = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm> | anchor.Program<typeof farmIdl>,
  plotCurrency: PublicKey,
  plotX: number,
  plotY: number,
  userWallet: anchor.Wallet,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

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
        .mintPlot(plotX, plotY)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
          plotCurrencyMint: plotCurrency,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }

  const plotMintIds = []
  const plotIds = []
  // Mint neighbors
  // left/up/down/right
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

      const [neighborPlotMint] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farm.toBuffer()],
        program.programId,
      )

      plotMintIds.push(neighborPlotMint)

      const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        program.programId,
      )

      plotIds.push(plotId)
      try {
        // eslint-disable-next-line no-await-in-loop
        await wrapTx(
          program.methods
            .mintPlot(neighborX, neighborY)
            .accounts({
              user: userWallet.publicKey,
              plotMint: neighborPlotMint,
              plotCurrencyMint: plotCurrency,
            })
            .signers([userWallet.payer]),
        )
      } catch (error) {
        console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
        throw error
      }
    }
  }

  try {
    await wrapTx(
      program.methods
        .acquirePlot(plotX, plotY)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
          plotCurrencyMint: plotCurrency,
          plotLeft: plotIds[0],
          plotUp: plotIds[1],
          plotDown: plotIds[2],
          plotRight: plotIds[3],
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }
}

export const returnPlot = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm> | anchor.Program<typeof farmIdl>,
  plotCurrency: PublicKey,
  plotX: number,
  plotY: number,
  userWallet: anchor.Wallet,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  try {
    await wrapTx(
      program.methods
        .returnPlot(plotX, plotY)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
          plotCurrencyMint: plotCurrency,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }
}

export const revokePlot = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm> | anchor.Program<typeof farmIdl>,
  plotCurrency: PublicKey,
  plotX: number,
  plotY: number,
  userWallet: anchor.Wallet,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  const plotMintIds = []
  const plotIds = []
  // Mint neighbors
  // left/up/down/right
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

      const [neighborPlotMint] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farm.toBuffer()],
        program.programId,
      )

      plotMintIds.push(neighborPlotMint)

      const [plotId] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        program.programId,
      )

      plotIds.push(plotId)
    }
  }

  const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plant'), plotMint.toBuffer()],
    program.programId,
  )

  const plant = await program.account.plant.fetch(plantId)

  try {
    await wrapTx(
      program.methods
        .revokePlot(plotX, plotY)
        .accountsPartial({
          user: userWallet.publicKey,
          plotMint,
          plotCurrencyMint: plotCurrency,
          seedMint: plant.seedMint,
          plant: plantId,
          plotMintLeft: plotMintIds[0],
          plotMintUp: plotMintIds[1],
          plotMintDown: plotMintIds[2],
          plotMintRight: plotMintIds[3],
          plotLeft: plotIds[0],
          plotUp: plotIds[1],
          plotDown: plotIds[2],
          plotRight: plotIds[3],
          plantTreasury: plant.treasury,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }
}

export const depositToPlot = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm> | anchor.Program<typeof farmIdl>,
  plotCurrency: PublicKey,
  plotX: number,
  plotY: number,
  userWallet: anchor.Wallet,
  amount: number,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  try {
    await wrapTx(
      program.methods
        .depositToPlot(plotX, plotY, new anchor.BN(amount))
        .accounts({
          user: userWallet.publicKey,
          plotMint,
          plotCurrencyMint: plotCurrency,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }
}

export const mintSeeds = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm> | anchor.Program<typeof farmIdl>,
  plotCurrency: PublicKey,
  plantMint: PublicKey,
  userWallet: anchor.Wallet,
  seedsToMint: number = 5,
  plantTokensPerSeed: number = 10000000,
  growthBlockDuration: number = 1000,
  neighborWaterDrainRate: number = 10,
  timesToTend: number = 5,
  balanceAbsorbRate: number = 1,
) => {
  console.log('balanceAbsorbRate', balanceAbsorbRate)
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [userPlotCurrencyAta] = anchor.web3.PublicKey.findProgramAddressSync(
    [userWallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plotCurrency.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  console.log('SEED userPlotCurrencyAta', userPlotCurrencyAta.toString())

  const [seedMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('seed_mint'),
      farm.toBuffer(),
      plantMint.toBuffer(),
      toLeBytes(plantTokensPerSeed, 8),
      userPlotCurrencyAta.toBuffer(),
    ],
    program.programId,
  )

  try {
    await wrapTx(
      program.methods
        .mintSeeds(
          plotCurrency,
          new anchor.BN(seedsToMint),
          new anchor.BN(plantTokensPerSeed),
          growthBlockDuration,
          neighborWaterDrainRate,
          new anchor.BN(balanceAbsorbRate),
          timesToTend,
          userPlotCurrencyAta,
        )
        .accountsPartial({
          plotCurrencyMint: plotCurrency,
          user: userWallet.publicKey,
          plantMint,
          seedMint,
          farm,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }

  return seedMint
}

export const plantSeed = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm> | anchor.Program<typeof farmIdl>,
  plotX: number,
  plotY: number,
  plotCurrency: PublicKey,
  seedMint: PublicKey,
  userWallet: anchor.Wallet,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const neighborPlotMints = []
  const neighborPlots = []

  console.log(`center x: ${plotX}, y: ${plotY}`)

  // left/up/down/right
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      // skip the center and diagonal
      if (Math.abs(x) + Math.abs(y) !== 1) {
        continue
      }
      if (plotX + x < 0 || plotY + y < 0) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }
      if (plotX + x > 999 || plotY + y > 999) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }

      const neighborX = plotX + x
      const neighborY = plotY + y

      const [neighborPlotMint] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farm.toBuffer()],
        program.programId,
      )

      console.log(`neighborPlotMint x: ${neighborX}, y: ${neighborY} ${neighborPlotMint.toString()}`)

      const [neighborPlot] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        program.programId,
      )

      neighborPlotMints.push(neighborPlotMint)
      neighborPlots.push(neighborPlot)
    }
  }

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  try {
    await wrapTx(
      program.methods
        .plantSeed(plotX, plotY, plotCurrency)
        .accountsPartial({
          user: userWallet.publicKey,
          seedMint,
          plotMintLeft: neighborPlotMints[0],
          plotMintUp: neighborPlotMints[1],
          plotMintDown: neighborPlotMints[2],
          plotMintRight: neighborPlotMints[3],
          plotLeft: neighborPlots[0],
          plotUp: neighborPlots[1],
          plotDown: neighborPlots[2],
          plotRight: neighborPlots[3],
          plotMint,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }

  return seedMint
}

export const tendPlant = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm>,
  plotX: number,
  plotY: number,
  plotCurrency: PublicKey,
  userWallet: anchor.Wallet,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [farmAuth] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm_auth'), farm.toBuffer()],
    program.programId,
  )

  const [farmPlotCurrencyAta] = anchor.web3.PublicKey.findProgramAddressSync(
    [farm.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), plotCurrency.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  console.log('farm', farm.toString())
  console.log('farmAuth', farmAuth.toString())
  console.log('farmPlotCurrencyAta', farmPlotCurrencyAta.toString())

  const neighborPlotMints = []
  const neighborPlots = []

  console.log(`center x: ${plotX}, y: ${plotY}`)

  // left/up/down/right
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      // skip the center and diagonal
      if (Math.abs(x) + Math.abs(y) !== 1) {
        continue
      }
      if (plotX + x < 0 || plotY + y < 0) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }
      if (plotX + x > 999 || plotY + y > 999) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }

      const neighborX = plotX + x
      const neighborY = plotY + y

      const [neighborPlotMint] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farm.toBuffer()],
        program.programId,
      )

      console.log(`neighborPlotMint x: ${neighborX}, y: ${neighborY} ${neighborPlotMint.toString()}`)

      const [neighborPlot] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        program.programId,
      )

      neighborPlotMints.push(neighborPlotMint)
      neighborPlots.push(neighborPlot)
    }
  }

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plant'), plotMint.toBuffer()],
    program.programId,
  )

  const plant = await program.account.plant.fetch(plantId)
  console.log('plant treasury', plant.treasury.toString())

  try {
    await wrapTx(
      program.methods
        .tendPlant(plotX, plotY)
        .accountsPartial({
          user: userWallet.publicKey,
          plotMintLeft: neighborPlotMints[0],
          plotMintUp: neighborPlotMints[1],
          plotMintDown: neighborPlotMints[2],
          plotMintRight: neighborPlotMints[3],
          plotLeft: neighborPlots[0],
          plotUp: neighborPlots[1],
          plotDown: neighborPlots[2],
          plotRight: neighborPlots[3],
          plotMint,
          plotCurrencyMint: plotCurrency,
          plantTreasury: plant.treasury,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }

  return plotMint
}

export const harvestPlant = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm>,
  plotX: number,
  plotY: number,
  plotCurrency: PublicKey,
  seedMint: PublicKey,
  userWallet: anchor.Wallet,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const neighborPlotMints = []
  const neighborPlots = []

  console.log(`center x: ${plotX}, y: ${plotY}`)

  // left/up/down/right
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      // skip the center and diagonal
      if (Math.abs(x) + Math.abs(y) !== 1) {
        continue
      }
      if (plotX + x < 0 || plotY + y < 0) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }
      if (plotX + x > 999 || plotY + y > 999) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }

      const neighborX = plotX + x
      const neighborY = plotY + y

      const [neighborPlotMint] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farm.toBuffer()],
        program.programId,
      )

      console.log(`neighborPlotMint x: ${neighborX}, y: ${neighborY} ${neighborPlotMint.toString()}`)

      const [neighborPlot] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        program.programId,
      )

      neighborPlotMints.push(neighborPlotMint)
      neighborPlots.push(neighborPlot)
    }
  }

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plant'), plotMint.toBuffer()],
    program.programId,
  )

  const [seedInfoId] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('seed_mint_info'), seedMint.toBuffer()],
    program.programId,
  )

  const plant = await program.account.plant.fetch(plantId)
  const seedInfo = await program.account.seedMintInfo.fetch(seedInfoId)
  console.log('plant treasury', plant.treasury.toString())

  try {
    await wrapTx(
      program.methods
        .harvestPlant(plotX, plotY)
        .accountsPartial({
          user: userWallet.publicKey,
          seedMint,
          plotMintLeft: neighborPlotMints[0],
          plotMintUp: neighborPlotMints[1],
          plotMintDown: neighborPlotMints[2],
          plotMintRight: neighborPlotMints[3],
          plotLeft: neighborPlots[0],
          plotUp: neighborPlots[1],
          plotDown: neighborPlots[2],
          plotRight: neighborPlots[3],
          plotMint,
          plantMint: seedInfo.plantMint,
          plantTreasury: plant.treasury,
          plotCurrencyMint: plotCurrency,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }

  return seedMint
}

export const revertPlant = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm>,
  plotX: number,
  plotY: number,
  plotCurrency: PublicKey,
  seedMint: PublicKey,
  userWallet: anchor.Wallet,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const neighborPlotMints = []
  const neighborPlots = []

  console.log(`center x: ${plotX}, y: ${plotY}`)

  // left/up/down/right
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      // skip the center and diagonal
      if (Math.abs(x) + Math.abs(y) !== 1) {
        continue
      }
      if (plotX + x < 0 || plotY + y < 0) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }
      if (plotX + x > 999 || plotY + y > 999) {
        neighborPlotMints.push(PublicKey.default)
        continue
      }

      const neighborX = plotX + x
      const neighborY = plotY + y

      const [neighborPlotMint] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot_mint'), toLeBytes(neighborX), toLeBytes(neighborY), farm.toBuffer()],
        program.programId,
      )

      console.log(`neighborPlotMint x: ${neighborX}, y: ${neighborY} ${neighborPlotMint.toString()}`)

      const [neighborPlot] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('plot'), neighborPlotMint.toBuffer()],
        program.programId,
      )

      neighborPlotMints.push(neighborPlotMint)
      neighborPlots.push(neighborPlot)
    }
  }

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

  const [plantId] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plant'), plotMint.toBuffer()],
    program.programId,
  )

  const [seedInfoId] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('seed_mint_info'), seedMint.toBuffer()],
    program.programId,
  )

  const plant = await program.account.plant.fetch(plantId)
  const seedInfo = await program.account.seedMintInfo.fetch(seedInfoId)
  console.log('plant treasury', plant.treasury.toString())

  try {
    await wrapTx(
      program.methods
        .revertPlant(plotX, plotY)
        .accountsPartial({
          user: userWallet.publicKey,
          seedMint,
          plotMintLeft: neighborPlotMints[0],
          plotMintUp: neighborPlotMints[1],
          plotMintDown: neighborPlotMints[2],
          plotMintRight: neighborPlotMints[3],
          plotLeft: neighborPlots[0],
          plotUp: neighborPlots[1],
          plotDown: neighborPlots[2],
          plotRight: neighborPlots[3],
          plotMint,
          plantMint: seedInfo.plantMint,
          plantTreasury: plant.treasury,
          plotCurrencyMint: plotCurrency,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }

  return seedMint
}

// because not time-travel functionality :(
export const waitForSlots = async (provider: anchor.AnchorProvider, startSlot: number, slotDifference = 10) => {
  let wait = true
  while (wait) {
    // eslint-disable-next-line no-await-in-loop
    const nowSlot = await provider.connection.getSlot()
    wait = nowSlot - startSlot < slotDifference

    if (wait) {
      console.log('Waiting...')
    }
    // eslint-disable-next-line no-promise-executor-return, no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

/// RECIPE

export const createRecipe = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm>,
  plotCurrency: PublicKey,
  resultToken: PublicKey,
  ingredient0: PublicKey,
  ingredient1: PublicKey,
  ingredient0AmountPer: anchor.BN,
  ingredient1AmountPer: anchor.BN,
  resultTokenToDeposit: anchor.BN,
  userWallet: anchor.Wallet,
  recipeId: PublicKey,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  try {
    await wrapTx(
      program.methods
        .createRecipe(plotCurrency, ingredient0AmountPer, ingredient1AmountPer, resultTokenToDeposit)
        .accountsPartial({
          user: userWallet.publicKey,
          ingredient0Mint: ingredient0,
          ingredient1Mint: ingredient1,
          resultMint: resultToken,
          recipe: recipeId,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }
}

/// OFFER

export const createOffer = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm>,
  plotCurrency: PublicKey,
  resultToken: PublicKey,
  pricePerToken: anchor.BN,
  resultTokenToDeposit: anchor.BN,
  userWallet: anchor.Wallet,
  offerId: PublicKey,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  try {
    await wrapTx(
      program.methods
        .createOffer(pricePerToken, resultTokenToDeposit)
        .accountsPartial({
          user: userWallet.publicKey,
          resultMint: resultToken,
          plotCurrencyMint: plotCurrency,
          offer: offerId,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }
}

export const cancelOffer = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm>,
  plotCurrency: PublicKey,
  resultToken: PublicKey,
  pricePerToken: anchor.BN,
  userWallet: anchor.Wallet,
  offerId: PublicKey,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  try {
    await wrapTx(
      program.methods
        .cancelOffer(pricePerToken)
        .accountsPartial({
          user: userWallet.publicKey,
          resultMint: resultToken,
          plotCurrencyMint: plotCurrency,
          offer: offerId,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }
}
