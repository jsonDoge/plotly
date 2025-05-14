/* eslint-disable @typescript-eslint/naming-convention */
import React, { useState } from 'react'
// import { convertToSeed, getProductBalance } from '../../services/barn'
import { useAnchorProvider } from '@/context/solana'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { isValidPublicKey } from '@/services/utils'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from 'bn.js'
import { acceptOfferTx, cancelOfferTx, createOfferTx } from '@/services/farm'
import getConfig from 'next/config'
import { getFarmProgram } from '@project/anchor'
import Button from '../utils/button'
import Spinner from '../utils/spinner'
import HelperTooltip from '../utils/helperTooltip'

const { publicRuntimeConfig } = getConfig()

const Market = () => {
  const wallet = useWallet()
  const provider = useAnchorProvider()
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // CREATING
  const [resultTokenId, setResultTokenId] = useState('')
  const [resultTokensToDeposit, setResultTokensToDeposit] = useState(1)

  const [pricePerToken, setPricePerToken] = useState(1)

  // ACCEPTING
  const [offerId, setOfferId] = useState('')
  const [aResultTokenId, setAResultTokenId] = useState('')

  const [aResultTokensToReceive, setAResultTokensToReceive] = useState(1)
  const [aResultTokensLeft, setAResultTokensLeft] = useState(0) // seeds

  const [aPricePerToken, setAPricePerToken] = useState(0) // seeds

  // CANCELLING
  const [cOfferId, setCOfferId] = useState('')

  const getOffer = async () => {
    const farm = getFarmProgram(provider)

    let offer
    try {
      offer = await farm.account.offer.fetch(new PublicKey(offerId))
    } catch (e) {
      setError('Failed to fetch offer, please check the offer ID')
    }

    if (!offer || offer.resultToken === PublicKey.default) {
      setError('Offer not found')
      return
    }

    setAResultTokenId(offer.resultToken.toString())
    setAResultTokensLeft(offer.resultTokenBalance.toNumber())
    setAPricePerToken(offer.priceAmountPerToken.toNumber())
  }

  const createOffer = async () => {
    setMessage('')
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    const farm = getFarmProgram(provider)

    if (!isValidPublicKey(resultTokenId)) {
      setError('Invalid result token address')
      return
    }

    if (resultTokensToDeposit === 0 || pricePerToken === 0) {
      setError('Neigher price requirements nor the result token deposit can be zero')
      return
    }

    // result token has to be a SEED token

    let seedInfo
    try {
      const [seedInfoId] = PublicKey.findProgramAddressSync(
        [Buffer.from('seed_mint_info'), new PublicKey(resultTokenId).toBuffer()],
        farm.programId,
      )

      seedInfo = await farm.account.seedMintInfo.fetch(seedInfoId)

      if (!seedInfo || seedInfo.plantMint === PublicKey.default) {
        setError('Result token address is not a seed token')
        return
      }
    } catch (e) {
      setError('Is the result token a seed? Failed to fetch result token (seed) info')
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

    if (balanceBN.ltn(resultTokensToDeposit)) {
      setError('Not enough result token balance to deposit for the offer')
      return
    }

    const { tx, offerId: offerId_ } = await createOfferTx(
      wallet.publicKey,
      provider,
      new PublicKey(resultTokenId),
      new BN(pricePerToken),
      new BN(resultTokensToDeposit),
      new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
    )

    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash

    tx.feePayer = wallet.publicKey
    const signedTx = await wallet?.signTransaction(tx)
    const rawTransaction = signedTx.serialize()
    try {
      setIsLoading(true)
      await provider.connection.sendRawTransaction(rawTransaction)
    } catch (e) {
      setIsLoading(false)
      setError('Failed to send transaction')
      return
    }
    setIsLoading(false)
    setError('')

    setMessage(`Offer created!: ${offerId_.toString()}`)
  }

  const acceptOffer = async () => {
    setMessage('')
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    if (aResultTokensToReceive > aResultTokensLeft) {
      setError('Not enough result tokens left in the offer')
      return
    }

    // INGREDIENT 0

    const plotCurrencyNeeded = aPricePerToken * aResultTokensToReceive

    const [plotCurrencyAta] = PublicKey.findProgramAddressSync(
      [
        wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID).toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    let plotCurrencyBalance
    try {
      plotCurrencyBalance = await provider.connection.getTokenAccountBalance(plotCurrencyAta)
    } catch (e) {
      setError('Failed to fetch token account balance')
      return
    }

    const plotCurrencyBalanceBN = new BN(plotCurrencyBalance.value.amount)

    if (plotCurrencyBalanceBN.ltn(plotCurrencyNeeded)) {
      setError('Not enough farm currency (USDC) balance to accept the offer')
      return
    }

    // check that first ingredient is an SPL token

    console.log('resultTokenId', resultTokenId)

    const { tx, offerId: offerId_ } = await acceptOfferTx(
      wallet.publicKey,
      provider,
      new PublicKey(aResultTokenId),
      new BN(aPricePerToken),
      new BN(aResultTokensToReceive),
      new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
      new PublicKey(offerId),
    )

    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash

    tx.feePayer = wallet.publicKey
    const signedTx = await wallet?.signTransaction(tx)
    const rawTransaction = signedTx.serialize()
    try {
      setIsLoading(true)
      await provider.connection.sendRawTransaction(rawTransaction)
    } catch (e) {
      setIsLoading(false)
      setError('Failed to send transaction')
      return
    }
    setIsLoading(false)
    setError('')

    setMessage(`Offer accepted received seeds: ${resultTokenId} - ${aResultTokensToReceive}`)
  }

  const cancelOffer = async () => {
    setMessage('')
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    const farm = getFarmProgram(provider)

    let offer
    try {
      offer = await farm.account.offer.fetch(new PublicKey(cOfferId))
    } catch (e) {
      setError('Failed to find offer')
      return
    }

    // check that first ingredient is an SPL token

    const { tx, offerId: offerId_ } = await cancelOfferTx(
      wallet.publicKey,
      provider,
      offer.resultToken,
      offer.priceAmountPerToken,
      new PublicKey(publicRuntimeConfig.PLOT_CURRENCY_MINT_ID),
      new PublicKey(cOfferId),
    )

    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash

    tx.feePayer = wallet.publicKey
    const signedTx = await wallet?.signTransaction(tx)
    const rawTransaction = signedTx.serialize()
    try {
      setIsLoading(true)
      await provider.connection.sendRawTransaction(rawTransaction)
    } catch (e) {
      setIsLoading(false)
      setError('Failed to send transaction')
      return
    }
    setIsLoading(false)
    setError('')

    setMessage(`Offer cancelled: ${cOfferId}`)
  }

  const tabs = ['Create offer', 'Accept offer', 'Cancel offer']
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <div className="flex flex-col">
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="mt-2 text-center text-gray-500">
          <div className="text-2xl">Market</div>
        </div>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-2 ${tab === activeTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}

        {activeTab === tabs[0] && (
          <div>
            <div className="mt-2">
              <div className="text-xl text-center text-gray-500">{activeTab}</div>
              <div className="px-2 py-3 rounded-sm">
                <div className="text-center">
                  <div className="text-gray-500 text-left">
                    Seed token ID <HelperTooltip message="Only this farm created seeds are allowed" />
                  </div>
                  <input
                    className="w-full rounded-sm  text-white pl-1"
                    id="ResultTokenId"
                    name="ResultTokenId"
                    type="string"
                    value={resultTokenId}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setResultTokenId(e.target.value)
                    }}
                  />
                  <div className="text-gray-500 text-left">Seed tokens to deposit</div>
                  <input
                    className="w-full rounded-sm  text-white pl-1"
                    id="seeds to craft / min: 1"
                    name="seeds to craft  / min: 1"
                    max={1000000000}
                    min={1}
                    type="number"
                    value={resultTokensToDeposit}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setResultTokensToDeposit(parseInt(e.target.value || '0', 10))
                    }
                  />

                  <div className="text-gray-500 text-left">
                    Price in farm currency (USDC)
                    <HelperTooltip message="`Price per one result seed" />
                  </div>
                  <input
                    className="w-full rounded-sm  text-white pl-1"
                    id="Ingredient1IdAmount"
                    name="Ingredient1IdAmount"
                    max={1000000000}
                    min={1}
                    type="number"
                    value={pricePerToken}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPricePerToken(parseInt(e.target.value || '0', 10))
                    }
                  />
                  <div className="mt-5">*Ingredients cant be the same ID and cant be zero.</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col mt-5">
              <div className="text-center">
                {wallet?.publicKey && (
                  <Button onClick={() => createOffer()}>
                    {!isLoading && <div>Create Offer</div>}
                    {isLoading && <Spinner />}
                  </Button>
                )}
              </div>
              <div className="text-center mt-5 bg-black bg-opacity-50">
                {error && <div className="text-red-500">{error}</div>}
              </div>
              <div className="text-center mt-5 bg-black bg-opacity-50">
                {message && <div className="text-green-500">{message}</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === tabs[1] && (
          <div>
            <div className="mt-2">
              <div className="text-xl text-center text-gray-500">{activeTab}</div>
              <div className="px-2 py-3 rounded-sm">
                <div className="text-center">
                  <div className="text-gray-500 text-left">
                    Offer ID
                    <HelperTooltip message="Id of a offer that has ALREADY been created" />
                  </div>
                  <input
                    className="w-full rounded-sm  text-white pl-1"
                    id="offerIdToFind"
                    name="offerIdToFind"
                    value={offerId}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => setOfferId(e.target.value)}
                  />
                  <div className="text-gray-500 text-left">Seed quantity to buy</div>
                  <input
                    className="w-full rounded-sm  text-white pl-1"
                    id="resultSeedTokensToReceive"
                    name="resultSeedTokensToReceive"
                    max={1000000000}
                    min={1}
                    type="number"
                    value={aResultTokensToReceive}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAResultTokensToReceive(parseInt(e.target.value || '0', 10))
                    }
                  />

                  <div className="mt-2">
                    <Button onClick={() => getOffer()}>
                      {!isLoading && <div>Find Offer</div>}
                      {isLoading && <Spinner />}
                    </Button>
                  </div>

                  <div className="text-gray-500 text-left mt-4 font-bold">Seeds left in offer</div>
                  <div className="text-gray-500 text-center">{aResultTokensLeft || '-'}</div>

                  <div className="text-gray-500 text-left mt-4 font-bold mt-2">Seed token ID</div>
                  <div className="text-gray-500 text-center">{aResultTokenId || '-'}</div>

                  <div className="text-gray-500 text-left font-bold mt-2">Farm currency price per seed</div>
                  <div className="text-gray-500 text-center">{aPricePerToken || '0'}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col mt-5">
              <div className="text-center">
                {wallet?.publicKey && (
                  <Button onClick={() => acceptOffer()}>
                    {!isLoading && <div>Accept Offer</div>}
                    {isLoading && <Spinner />}
                  </Button>
                )}
              </div>
              <div className="text-center mt-5 bg-black bg-opacity-50">
                {error && <div className="text-red-500">{error}</div>}
              </div>
              <div className="text-center mt-5 bg-black bg-opacity-50">
                {message && <div className="text-green-500">{message}</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === tabs[2] && (
          <div>
            <div className="mt-2">
              <div className="text-xl text-center text-gray-500">{activeTab}</div>
              <div className="px-2 py-3 rounded-sm">
                <div className="text-center">
                  <div className="text-gray-500 text-left">
                    Offer ID
                    <HelperTooltip message="Offer ID to cancel" />
                  </div>
                  <input
                    className="w-full rounded-sm  text-white pl-1"
                    id="offerIdToCancel"
                    name="offerIdToCancel"
                    value={cOfferId}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => setCOfferId(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col mt-5">
              <div className="text-center">
                {wallet?.publicKey && (
                  <Button onClick={() => cancelOffer()}>
                    {!isLoading && <div>Cancel Offer</div>}
                    {isLoading && <Spinner />}
                  </Button>
                )}
              </div>
              <div className="text-center mt-5 bg-black bg-opacity-50">
                {error && <div className="text-red-500">{error}</div>}
              </div>
              <div className="text-center mt-5 bg-black bg-opacity-50">
                {message && <div className="text-green-500">{message}</div>}
              </div>
            </div>
          </div>
        )}
        <div className="text-center">*Offer refilling currently not possible</div>
      </div>
    </div>
  )
}

export default Market
