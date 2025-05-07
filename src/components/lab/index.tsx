/* eslint-disable no-await-in-loop */
import React, { useState } from 'react'
// import { convertToSeed, getProductBalance } from '../../services/barn'
import { useAnchorProvider } from '@/context/solana'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { isValidPublicKey } from '@/services/utils'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from 'bn.js'
import { craftSeedTx } from '@/services/farm'
import getConfig from 'next/config'
import { walletActions } from '@/stores/wallet'
import { getFarmProgram } from '@project/anchor'
import Button from '../utils/button'
import Spinner from '../utils/spinner'
import HelperTooltip from '../utils/helperTooltip'

const { publicRuntimeConfig } = getConfig()

const fetchSeedName = async (seedId: string, retries = 3): Promise<string | null> => {
  const url = `${publicRuntimeConfig.INDEXER_URL}/seeds/${seedId}`
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        return data.seed_name || null
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 1500)
      })
    } catch (e) {
      console.error(`Attempt ${attempt + 1} to fetch seed name failed`, e)
    }
  }
  return null
}

const Lab = () => {
  const wallet = useWallet()
  const provider = useAnchorProvider()
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // const [productType, setProductType] = useState(PRODUCT_TYPE.CARROT)
  const [seedsToMint, setSeedsToMint] = useState(1)
  const [resultTokenPerSeed, setResultTokenPerSeed] = useState(1)
  const [resultTokenId, setResultTokenId] = useState('')
  const [growSlotDuration, setGrowSlotDuration] = useState(101)
  const [neighborToCenterWaterAbsorption, setNeighborToCenterWaterAbsorption] = useState(0)
  const [balanceAbsorbRate, setBalanceAbsorbRate] = useState(0)
  const [timesToTend, setTimesToTend] = useState(0)

  const craftSeeds = async () => {
    setMessage('')
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    if (!isValidPublicKey(resultTokenId)) {
      setError('Invalid result token address')
      return
    }

    let accountInfo
    try {
      accountInfo = await provider.connection.getAccountInfo(new PublicKey(resultTokenId))
      if (!accountInfo) {
        setError('Account for result token address not found')
        return
      }
    } catch (e) {
      setError('Failed to fetch account info for result token address')
      return
    }

    const isSplToken = accountInfo.owner.equals(TOKEN_PROGRAM_ID)
    if (!isSplToken) {
      setError('Result token address is not a SPL token')
      return
    }

    const [resultTokenAta] = PublicKey.findProgramAddressSync(
      [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(resultTokenId).toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    let balance
    try {
      balance = await provider.connection.getTokenAccountBalance(resultTokenAta)
    } catch (e) {
      setError('Failed to fetch token account balance')
      return
    }

    const balanceBN = new BN(balance.value.amount)
    const depositAmount = new BN(resultTokenPerSeed).mul(new BN(seedsToMint))
    if (balanceBN.lt(depositAmount)) {
      setError('Not enough result token balance to deposit')
      return
    }

    if (balanceAbsorbRate % 2 !== 0) {
      setError('Balance absorb rate must be divisible by 2')
      return
    }

    if (timesToTend > 0 && balanceAbsorbRate === 0) {
      setError('Balance absorb rate must be greater than 0 if times to tend is greater than 0')
      return
    }

    const { transaction: mintSeedsTx, seedMint } = await craftSeedTx(
      wallet.publicKey,
      provider,
      new BN(seedsToMint),
      new BN(resultTokenPerSeed),
      growSlotDuration,
      neighborToCenterWaterAbsorption,
      new BN(balanceAbsorbRate),
      timesToTend,
      new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
      new PublicKey(resultTokenId),
    )

    mintSeedsTx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash

    mintSeedsTx.feePayer = wallet.publicKey
    const signedTx = await wallet?.signTransaction(mintSeedsTx)
    const rawTransaction = signedTx.serialize()
    try {
      await provider.connection.sendRawTransaction(rawTransaction)
    } catch (e) {
      setError('Failed to send transaction')
      return
    }
    setError('')

    // const farm = getFarmProgram(provider)

    const nameString = await fetchSeedName(seedMint.toString())

    if (!nameString) {
      walletActions.addOwnedSeed({
        id: seedMint.toString(),
        name: '-Unknown- :(',
      })
      return
    }

    setMessage(`Seed minted!: ${seedMint.toString()}`)
    walletActions.addOwnedSeed({
      id: seedMint.toString(),
      name: nameString,
    })
  }

  return (
    <div className="flex flex-col">
      <div className="text-left text-white">
        <div className="text-2xl">Lab</div>
      </div>
      <div className="mt-2">
        <div className="text-xl text-white">SPL tokens to Seeds</div>
        <div className="bg-green-800 px-2 py-3 rounded-sm">
          <div className="text-center">
            <div className="text-white text-left">Seeds to craft</div>
            <input
              className="w-full rounded-sm"
              id="seeds to craft / min: 1"
              name="seeds to craft  / min: 1"
              max={1000000000}
              min={1}
              type="number"
              value={seedsToMint}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setSeedsToMint(parseInt(e.target.value || '0', 10))}
            />
            <div className="text-white text-left">
              Result token ID{' '}
              <HelperTooltip message="Token which the farmers are going to receive if they grow the seed to the end. The tokens you are now going to have to deposit (only SPL tokens allows/non-2022)." />
            </div>
            <input
              className="w-full rounded-sm"
              id="ResultTokenId"
              name="ResultTokenId"
              type="string"
              value={resultTokenId}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                setResultTokenId(e.target.value)
              }}
            />
            <div className="text-white text-left  mt-2">Result tokens per seed / min: 1</div>
            <input
              className="w-full rounded-sm"
              id="result tokens per seed / min: 1"
              name="result tokens per seed / min: 1"
              max={1000000000}
              min={1}
              type="number"
              value={resultTokenPerSeed}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setResultTokenPerSeed(parseInt(e.target.value || '0', 10))
              }
            />
            <div className="text-white text-left  mt-2">
              Plant growth duration <HelperTooltip message="(slot = 0.4s) / min: 101" />
            </div>
            <input
              className="w-full rounded-sm"
              id=""
              name="plant growth duration (slots - 0.4s) / min: 101"
              max={1000000000}
              min={101}
              type="number"
              value={growSlotDuration}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setGrowSlotDuration(parseInt(e.target.value || '0', 10))
              }
            />

            <div className="text-white text-left  mt-2">
              Neighbor/Center water absorb rate{' '}
              <HelperTooltip message="Currently plants always try to absorb 100 waters per slot. Here you can only change the ratio between center:neighbors. 0 = all 100 water is absorbed from plants own plot. 25 = all water is absorbed from neighboring 4 plots (4 * 25 = 100) " />
            </div>

            <input
              className="w-full rounded-sm mt-2"
              id="Neighbor to center water absorption / min: 0"
              name="Neighbor to center water absorption / min: 0"
              max={25}
              min={0}
              type="number"
              value={neighborToCenterWaterAbsorption}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNeighborToCenterWaterAbsorption(parseInt(e.target.value || '0', 10))
              }
            />

            <div className="text-white text-left  mt-2">
              Balance absorb rate (divisible by 2) <HelperTooltip message="Plot currency absorbed per slot speed" />
            </div>

            <input
              className="w-full rounded-sm mt-2"
              id="BalanceAbsorbRate"
              name="BalanceAbsorbRate"
              max={100000000}
              min={0}
              step={2}
              type="number"
              value={balanceAbsorbRate}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBalanceAbsorbRate(parseInt(e.target.value || '0', 10))
              }
            />

            <div className="text-white text-left  mt-2">
              Times to tend{' '}
              <HelperTooltip message="During plants growth user will be required to 'tend' the plant N-times. Which sends the up to date absorbed balance to the seed creators token account." />
            </div>

            <input
              className="w-full rounded-sm mt-2"
              id="TimesToTend"
              name="TimesToTend"
              max={5}
              min={0}
              type="number"
              value={timesToTend}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setTimesToTend(parseInt(e.target.value || '0', 10))}
            />

            <div className="mt-5">*All token amounts are expected to include the decimal part.</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col mt-5">
        <div className="text-right">
          {wallet?.publicKey ? (
            <Button onClick={() => craftSeeds()}>
              {!isLoading && <div>Craft Seed</div>}
              {isLoading && <Spinner />}
            </Button>
          ) : (
            <Spinner />
          )}
        </div>
        <div className="text-center mt-5 bg-black bg-opacity-50">
          {error && <div className="text-red-500">{error}</div>}
        </div>
        <div className="text-center mt-5 bg-black bg-opacity-50">
          {message && <div className="text-green-500">{message}</div>}
        </div>
      </div>

      {/* <div className="flex flex-col justify-start items-start text-white mt-5">
        <div className="text-lg">Products</div>
        <div>(owned)</div>
      </div> */}
    </div>
  )
}

export default Lab
