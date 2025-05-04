import { AnchorProvider, Idl, Program, Wallet, web3 } from '@coral-xyz/anchor'
import path from 'path'
import fs from 'fs'
import { increasedCUTxWrap, mintAndBuyPlot, mintSeeds, plantSeed, revertPlant, toLeBytes, waitForSlots } from '../tests/helpers'
import { setupMint } from '../tests/setup'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import FarmIDL from '../target/idl/farm.json'
import { Farm } from '@project/anchor'
import { Connection, PublicKey } from '@solana/web3.js'

// so that the plotCurrency address would be the same
const localnetPlotCurrencyKeypairPath = './localnet/plotCurrency.json'

const userKeypairPath = './localnet/testUser.json'
// process.env.ANCHOR_WALLET = "./localnet/testUser.json";

// eslint-disable-next-line global-require
const farmIdl = require('../target/idl/farm.json') as Idl
const anchor = require('@coral-xyz/anchor')

function getFarmProgram(provider: AnchorProvider): Program<Farm> {
  return new Program(FarmIDL as Farm, provider)
}

async function waitForBalance(connection: Connection, pubkey: PublicKey, expectedLamports: 1000, maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    const balance = await connection.getBalance(pubkey);
    console.log(balance);
    if (balance >= expectedLamports) {
      console.log('balance found!')

      return
    };
    console.log('waiting for balance...')

    await new Promise((res) => setTimeout(res, 1000)); // wait 0.5s
  }
  throw new Error("Balance did not arrive in time");
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

  const sig = await provider.connection.requestAirdrop(userWallet.publicKey, 1000_000_000_000);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  await provider.connection.confirmTransaction({
    signature: sig,
    blockhash,
    lastValidBlockHeight
  }, "finalized");

  await waitForBalance(provider.connection, userWallet.publicKey, 1000)

  const wrapTx = increasedCUTxWrap(provider.connection, userWallet.payer)

  const program = getFarmProgram(provider)

  const keypairData = JSON.parse(fs.readFileSync(path.join(process.cwd(), localnetPlotCurrencyKeypairPath), 'utf8'))
  const plotCurrencyKeypair = web3.Keypair.fromSecretKey(new Uint8Array(keypairData))

  const plotCurrency = plotCurrencyKeypair.publicKey

  const [farm] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm'), plotCurrency.toBuffer()],
    program.programId,
  )

  const [farmAuth] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('farm_auth'), farm.toBuffer()],
    program.programId,
  )

  const plotX = 1
  const plotY = 1

  await mintAndBuyPlot(provider, program, plotCurrency, plotX, plotY, userWallet)

  const plotX2 = 3
  const plotY2 = 2

  await mintAndBuyPlot(provider, program, plotCurrency, plotX2, plotY2, userWallet)

  // random result token
  const plantMint = await setupMint(provider, TOKEN_PROGRAM_ID)
  
  const seedsToMint = 5
  const plantTokensPerSeed = 10000000
  const growthBlockDuration = 101
  const waterDrainRate = 10
  const timesToTend = 1
  const balanceAbsorbRate = 200000 // highly consuming


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

  await plantSeed(provider, program, plotX, plotY, plotCurrency, seedMint, userWallet)
  await plantSeed(provider, program, plotX2, plotY2, plotCurrency, seedMint, userWallet)
    
  await waitForSlots(provider, await provider.connection.getSlot(), 2)

  await revertPlant(provider, program, plotX2, plotY2, plotCurrency, seedMint, userWallet)

  console.log('succsessfully ran other user script:')
  // Add your deploy script here.
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
