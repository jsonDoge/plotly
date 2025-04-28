import * as anchor from '@coral-xyz/anchor'
import { Farm } from '@project/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'

export function toLeBytes(value: number, byteLength = 4, signed = false) {
  const buffer = Buffer.alloc(byteLength)

  let newVal: any = value

  switch (byteLength) {
    case 1:
      buffer.writeUInt8(value, 0)
      break
    case 2:
      if (signed) {
        buffer.writeInt16LE(value, 0)
      } else {
        buffer.writeUInt16LE(value, 0)
      }
      break
    case 4:
      if (signed) {
        buffer.writeInt32LE(value, 0)
      } else {
        buffer.writeUInt32LE(value, 0)
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
  program: anchor.Program<Farm>,
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
        .mintPlot(plotX, plotY, plotCurrency)
        .accounts({
          user: userWallet.publicKey,
          plotMint,
        })
        .signers([userWallet.payer]),
    )
  } catch (error) {
    console.error('Error acquiring plot:', JSON.stringify(error, Object.getOwnPropertyNames(error), 4))
    throw error
  }

  // Mint neighbors
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

      try {
        // eslint-disable-next-line no-await-in-loop
        await wrapTx(
          program.methods
            .mintPlot(neighborX, neighborY, plotCurrency)
            .accounts({
              user: userWallet.publicKey,
              plotMint: neighborPlotMint,
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
    throw error
  }
}

export const mintSeeds = async (
  provider: anchor.AnchorProvider,
  program: anchor.Program<Farm>,
  plotCurrency: PublicKey,
  plantMint: PublicKey,
  userWallet: anchor.Wallet,
  seedsToMint: number = 5,
  plantTokensPerSeed: number = 10000000,
  growthBlockDuration: number = 1000,
  waterRate: number = 10,
  balanceRate: number = 1,
) => {
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [seedMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('seed_mint'),
      farm.toBuffer(),
      plantMint.toBuffer(),
      toLeBytes(plantTokensPerSeed, 8),
      userWallet.publicKey.toBuffer(),
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
          waterRate,
          new anchor.BN(balanceRate),
          userWallet.publicKey,
        )
        .accountsPartial({
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

  // right/up/down/left
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
          plotMintRight: neighborPlotMints[0],
          plotMintUp: neighborPlotMints[1],
          plotMintDown: neighborPlotMints[2],
          plotMintLeft: neighborPlotMints[3],
          plotRight: neighborPlots[0],
          plotUp: neighborPlots[1],
          plotDown: neighborPlots[2],
          plotLeft: neighborPlots[3],
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
