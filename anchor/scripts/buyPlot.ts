import { AnchorProvider, Idl, Program, Wallet, web3 } from '@coral-xyz/anchor'
import path from 'path'
import fs from 'fs'
import { increasedCUTxWrap, toLeBytes } from '../tests/helpers'

// so that the plotCurrency address would be the same
const localnetPlotCurrencyKeypairPath = './localnet/plotCurrency.json'

// eslint-disable-next-line global-require
const farmIdl = require('../target/idl/farm.json') as Idl
const anchor = require('@coral-xyz/anchor')

function getFarmProgram(provider: AnchorProvider): Program<typeof farmIdl> {
  return new Program<typeof farmIdl>(farmIdl, provider)
}

async function main() {
  // Configure client to use the provider.
  // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
  const provider_ = anchor.AnchorProvider.env()

  const network = process.env.NETWORK || 'localnet'

  if (!['devnet', 'localnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}. Must be one of "devnet" or "localnet".`)
  }

  const connection = new web3.Connection(provider_.connection.rpcEndpoint, {
    commitment: 'confirmed',
  })

  const provider = new AnchorProvider(connection, provider_.wallet)
  anchor.setProvider(provider)

  console.log('Provider:', provider.connection.rpcEndpoint)

  const userWallet = provider.wallet as Wallet
  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const program = getFarmProgram(provider)

  const keypairData = JSON.parse(fs.readFileSync(path.join(process.cwd(), localnetPlotCurrencyKeypairPath), 'utf8'))
  const plotCurrencyKeypair = web3.Keypair.fromSecretKey(new Uint8Array(keypairData))

  const plotCurrency = plotCurrencyKeypair.publicKey

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const plotX = 3
  const plotY = 3

  const [plotMint] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('plot_mint'), toLeBytes(plotX), toLeBytes(plotY), farm.toBuffer()],
    program.programId,
  )

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
  }

  console.log('succsessfully acquired plot:', plotMint.toString())
  // Add your deploy script here.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
