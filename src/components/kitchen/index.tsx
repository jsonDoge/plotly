/* eslint-disable @typescript-eslint/naming-convention */
import React, { useState } from 'react'
// import { convertToSeed, getProductBalance } from '../../services/barn'
import { useAnchorProvider } from '@/context/solana'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { isValidPublicKey } from '@/services/utils'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from 'bn.js'
import { craftRecipeTx } from '@/services/farm'
import getConfig from 'next/config'
import { getFarmProgram } from '@project/anchor'
import Button from '../utils/button'
import Spinner from '../utils/spinner'
import HelperTooltip from '../utils/helperTooltip'

const { publicRuntimeConfig } = getConfig()

const Kitchen = () => {
  const wallet = useWallet()
  const provider = useAnchorProvider()
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // CRAFTING
  const [resultTokenId, setResultTokenId] = useState('')
  const [resultTokensToDeposit, setResultTokensToDeposit] = useState(1)

  const [ingredient0Id, setIngredient0Id] = useState('')
  const [ingredient0AmountPer, setIngredient0AmountPer] = useState(1)

  const [ingredient1Id, setIngredient1Id] = useState('')
  const [ingredient1AmountPer, setIngredient1AmountPer] = useState(1)

  // FOLLOWING
  const [recipeId, setRecipeId] = useState('')
  const [fResultTokenId, setFResultTokenId] = useState('')
  const [fResultTokensToReceive, setFResultTokensToReceive] = useState(1)
  const [fResultTokensLeft, setFResultTokensLeft] = useState(0)

  const [fIngredient0Id, setFIngredient0Id] = useState('')
  const [fIngredient0AmountPer, setFIngredient0AmountPer] = useState(1)

  const [fIngredient1Id, setFIngredient1Id] = useState('')
  const [fIngredient1AmountPer, setFIngredient1AmountPer] = useState(1)

  const getRecipe = async () => {
    const farm = getFarmProgram(provider)

    let recipe
    try {
      recipe = await farm.account.recipe.fetch(new PublicKey(recipeId))
    } catch (e) {
      setError('Failed to fetch recipe, please check the recipe ID')
    }

    if (!recipe || recipe.resultToken === PublicKey.default) {
      setError('Recipe not found')
      return
    }

    setFIngredient0AmountPer(recipe.ingredient0AmountPer1ResultToken.toNumber())
    setFIngredient1AmountPer(recipe.ingredient1AmountPer1ResultToken.toNumber())
    setFIngredient0Id(recipe.ingredient0.toString())
    setFIngredient1Id(recipe.ingredient1.toString())
    setFResultTokenId(recipe.resultToken.toString())
    setFResultTokensLeft(recipe.resultTokenBalance.toNumber())
  }

  const craftRecipe = async () => {
    setMessage('')
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    if (!isValidPublicKey(resultTokenId)) {
      setError('Invalid result token address')
      return
    }

    if (!isValidPublicKey(ingredient0Id)) {
      setError('Invalid first ingredient token address')
      return
    }

    if (!isValidPublicKey(ingredient1Id)) {
      setError('Invalid second ingredient token address')
      return
    }

    if (resultTokensToDeposit === 0 || ingredient0AmountPer === 0 || ingredient1AmountPer === 0) {
      setError('Neigher ingredient requirements nor the result token deposit cant be zero')
      return
    }

    // check that result token is an SPL token

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
      setError('Result token address is not an SPL token')
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
      setError('Not enough result token balance to deposit for the recipe')
      return
    }

    // check that first ingredient is an SPL token

    let ingredient0accountInfo
    try {
      ingredient0accountInfo = await provider.connection.getAccountInfo(new PublicKey(resultTokenId))
      if (!ingredient0accountInfo) {
        setError('Account for first ingredient token address not found')
        return
      }
    } catch (e) {
      setError('Failed to fetch account info for first ingredient address')
      return
    }

    if (!ingredient0accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
      setError('First ingredient token address is not an SPL token')
      return
    }

    // check that second ingredient is an SPL token

    let ingredient1accountInfo
    try {
      ingredient1accountInfo = await provider.connection.getAccountInfo(new PublicKey(resultTokenId))
      if (!ingredient1accountInfo) {
        setError('Account for first ingredient token address not found')
        return
      }
    } catch (e) {
      setError('Failed to fetch account info for first ingredient address')
      return
    }

    if (!ingredient1accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
      setError('First ingredient token address is not an SPL token')
      return
    }

    const { tx, recipeId: recipeId_ } = await craftRecipeTx(
      wallet.publicKey,
      provider,
      new PublicKey(ingredient0Id),
      new BN(ingredient0AmountPer),
      new PublicKey(ingredient1Id),
      new BN(ingredient1AmountPer),
      new PublicKey(resultTokenId),
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

    setMessage(`Recipe created!: ${recipeId_.toString()}`)
  }

  const followRecipe = async () => {
    setMessage('')
    if (!wallet || !wallet?.connected || !wallet?.publicKey || !wallet?.signTransaction) {
      setError('Wallet not loaded yet... Please try again later')
      return
    }

    if (fResultTokensToReceive > fResultTokensLeft) {
      setError('Not enough result tokens left in the recipe')
      return
    }

    // INGREDIENT 0

    const ingredient0AmountNeeded = fIngredient0AmountPer * fResultTokensToReceive

    const [ingredient0TokenAta] = PublicKey.findProgramAddressSync(
      [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(fIngredient0Id).toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    let ingredient0Balance
    try {
      ingredient0Balance = await provider.connection.getTokenAccountBalance(ingredient0TokenAta)
    } catch (e) {
      setError('Failed to fetch token account balance')
      return
    }

    const ingredient0BalanceBN = new BN(ingredient0Balance.value.amount)

    if (ingredient0BalanceBN.ltn(ingredient0AmountNeeded)) {
      setError('Not enough ingredient 0 token balance to follow for the recipe')
      return
    }

    // INGREDIENT 1

    const ingredient1AmountNeeded = fIngredient1AmountPer * fResultTokensToReceive

    const [ingredient1TokenAta] = PublicKey.findProgramAddressSync(
      [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(fIngredient1Id).toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )

    let ingredient1Balance
    try {
      ingredient1Balance = await provider.connection.getTokenAccountBalance(ingredient1TokenAta)
    } catch (e) {
      setError('Failed to fetch token account balance')
      return
    }

    const ingredient1BalanceBN = new BN(ingredient1Balance.value.amount)

    if (ingredient1BalanceBN.ltn(ingredient1AmountNeeded)) {
      setError('Not enough ingredient 0 token balance to follow for the recipe')
      return
    }

    // check that first ingredient is an SPL token

    const { tx, recipeId: recipeId_ } = await craftRecipeTx(
      wallet.publicKey,
      provider,
      new PublicKey(ingredient0Id),
      new BN(ingredient0AmountPer),
      new PublicKey(ingredient1Id),
      new BN(ingredient1AmountPer),
      new PublicKey(resultTokenId),
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

    setMessage(`Recipe created!: ${recipeId_.toString()}`)
  }

  const tabs = ['Craft a recipe', 'Follow recipe']
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <div className="flex flex-col">
      <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="mt-2 text-center text-gray-500">
          <div className="text-2xl">Kitchen</div>
        </div>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 ${tab === activeTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}
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
                  <div className="text-gray-500 text-left">Result tokens to deposit</div>
                  <input
                    className="w-full rounded-sm"
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
                    Ingredient 0 ID
                    <HelperTooltip message="First ingredient SPL token ID to craft the recipe" />
                  </div>
                  <input
                    className="w-full rounded-sm"
                    id="Ingredient0Id"
                    name="Ingredient0Id"
                    type="string"
                    value={ingredient0Id}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setIngredient0Id(e.target.value)
                    }}
                  />

                  <div className="text-gray-500 text-left">
                    Ingredient 0 amount
                    <HelperTooltip message="`Ingredient 0` tokens needed to get 1 result token" />
                  </div>
                  <input
                    className="w-full rounded-sm"
                    id="Ingredient0IdAmount"
                    name="Ingredient0IdAmount"
                    max={1000000000}
                    min={1}
                    type="number"
                    value={ingredient0AmountPer}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIngredient0AmountPer(parseInt(e.target.value || '0', 10))
                    }
                  />

                  <div className="text-gray-500 text-left">
                    Ingredient 1 <HelperTooltip message="Second ingredient SPL token ID to craft the recipe" />
                  </div>
                  <input
                    className="w-full rounded-sm"
                    id="Ingredient1Id"
                    name="Ingredient1Id"
                    type="string"
                    value={ingredient1Id}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setIngredient1Id(e.target.value)
                    }}
                  />
                  <div className="text-gray-500 text-left">
                    Ingredient 1 amount
                    <HelperTooltip message="`Ingredient 1` tokens needed to get 1 result token" />
                  </div>
                  <input
                    className="w-full rounded-sm"
                    id="Ingredient1IdAmount"
                    name="Ingredient1IdAmount"
                    max={1000000000}
                    min={1}
                    type="number"
                    value={ingredient1AmountPer}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setIngredient1AmountPer(parseInt(e.target.value || '0', 10))
                    }
                  />
                  <div className="mt-5">*Ingredients cant be the same ID and cant be zero.</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col mt-5">
              <div className="text-center">
                {wallet?.publicKey ? (
                  <Button onClick={() => craftRecipe()}>
                    {!isLoading && <div>Craft Recipe</div>}
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
          </div>
        )}

        {activeTab === tabs[1] && (
          <div>
            <div className="mt-2">
              <div className="text-xl text-center text-gray-500">{activeTab}</div>
              <div className="px-2 py-3 rounded-sm">
                <div className="text-center">
                  <div className="text-gray-500 text-left">
                    Recipe ID
                    <HelperTooltip message="Id of a recipe that has ALREADY been crafted" />
                  </div>
                  <input
                    className="w-full rounded-sm"
                    id="seeds to craft / min: 1"
                    name="seeds to craft  / min: 1"
                    value={recipeId}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => setRecipeId(e.target.value)}
                  />
                  <div className="text-gray-500 text-left">Result tokens to receive</div>
                  <input
                    className="w-full rounded-sm"
                    id="resultTokensToReceive"
                    name="resultTokensToReceive"
                    max={1000000000}
                    min={1}
                    type="number"
                    value={fResultTokensToReceive}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFResultTokensToReceive(parseInt(e.target.value || '0', 10))
                    }
                  />

                  <div className="mt-2">
                    <Button onClick={() => getRecipe()}>
                      {!isLoading && <div>Find Recipe</div>}
                      {isLoading && <Spinner />}
                    </Button>
                  </div>

                  <div className="text-gray-500 text-left mt-4 font-bold">Result tokens left in recipe</div>
                  <div className="text-gray-500 text-center">{fResultTokensLeft || '-'}</div>

                  <div className="text-gray-500 text-left mt-4 font-bold mt-2">Result token ID</div>
                  <div className="text-gray-500 text-center">{fResultTokenId || '-'}</div>

                  <div className="text-gray-500 text-left font-bold mt-2">Ingredient 0 ID</div>
                  <div className="text-gray-500 text-center">{fIngredient0Id || '-'}</div>

                  <div className="text-gray-500 text-left font-bold mt-2">Ingredient 0 per result token</div>
                  <div className="text-gray-500 text-center">{fIngredient0AmountPer || '0'}</div>

                  <div className="text-gray-500 text-left font-bold mt-2">Ingredient 1 ID</div>
                  <div className="text-gray-500 text-center">{fIngredient1Id || '-'}</div>

                  <div className="text-gray-500 text-left font-bold mt-2">Ingredient 1 per result token</div>
                  <div className="text-gray-500 text-center">{fIngredient1AmountPer || '0'}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col mt-5">
              <div className="text-center">
                {wallet?.publicKey ? (
                  <Button onClick={() => followRecipe()}>
                    {!isLoading && <div>Follow Recipe</div>}
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
          </div>
        )}
      </div>
    </div>
  )
}

export default Kitchen
