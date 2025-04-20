import React, { useEffect, useState } from 'react'
// import { convertToSeed, getProductBalance } from '../../services/barn'
import { useWallet } from '../../context/wallet'
import { PRODUCT_TYPE, SEED_TYPE } from '../../utils/constants'
import { toSentenceCase } from '../../utils'
import Button from '../button'
import Spinner from '../spinner'

const Barn = () => {
  const { wallet } = useWallet()
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState('')

  const [productType, setProductType] = useState(PRODUCT_TYPE.CARROT)
  const [quantity, setQuantity] = useState(0)

  const [potatoBalance, setPotatoBalance] = useState(0)
  const [carrotBalance, setCarrotBalance] = useState(0)
  const [cornBalance, setCornBalance] = useState(0)
  const [weedBalance, setWeedBalance] = useState(0)

  const refreshBalances = async (walletAddress: string) => {
    getProductBalance(walletAddress, PRODUCT_TYPE.POTATO).then(setPotatoBalance)
    getProductBalance(walletAddress, PRODUCT_TYPE.CARROT).then(setCarrotBalance)
    getProductBalance(walletAddress, PRODUCT_TYPE.CORN).then(setCornBalance)
    getProductBalance(walletAddress, PRODUCT_TYPE.WEED).then(setWeedBalance)
  }

  useEffect(() => {
    if (!wallet?.address) {
      return
    }

    refreshBalances(wallet.address)
  }, [wallet?.address])

  const onConvertToSeed = async (
    productType_: string,
    quantity_: number,
    walletAddress: string,
    privateKey: string | undefined,
  ) => {
    if (quantity <= 0) {
      setError('Quantity has to be above 0')
      return
    }

    setError('')
    if (!privateKey) {
      return
    }
    setIsLoading(true)

    try {
      await convertToSeed(productType_, quantity_, walletAddress, privateKey)
    } catch (e) {
      setError('Convert failed')
      setIsLoading(false)
      return
    }
    refreshBalances(walletAddress)
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col">
      <div className="text-left text-white">
        <div className="text-2xl">Barn</div>
      </div>
      <div className="mt-2">
        <div className="text-xl text-white">Products to Seeds</div>
        <div className="bg-green-200 px-2 py-3 rounded-sm">
          <div className="text-center">
            <input
              className="w-full"
              id="quantity"
              name="quantity"
              max={100}
              min={0}
              type="number"
              value={quantity}
              onInput={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value || '0', 10))}
            />
            <select
              className="w-full mt-2"
              onChange={(e) => {
                setProductType(e.target.value)
              }}
              value={productType}
            >
              {Object.values(PRODUCT_TYPE)
                .filter((p) => Object.values(SEED_TYPE).includes(p))
                .map((v) => (
                  <option key={v} value={v}>
                    {toSentenceCase(v)}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-col mt-5">
        <div className="text-right">
          {wallet?.address ? (
            <Button onClick={() => onConvertToSeed(productType, quantity, wallet.address, wallet.privateKey)}>
              {!isLoading && <div>Convert to Seed</div>}
              {isLoading && <Spinner />}
            </Button>
          ) : (
            <Spinner />
          )}
        </div>
        <div className="text-center mt-5 bg-black bg-opacity-50">
          {error && <div className="text-red-500">{error}</div>}
        </div>
      </div>

      <div className="flex flex-col justify-start items-start text-white mt-5">
        <div className="text-lg">Products</div>
        <div>(owned)</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 rounded-sm">
        <div className="font-bold w-1/3 text-center">Potatoes</div>
        <div className="w-2/3 text-right px-10">{potatoBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">Carrots</div>
        <div className="w-2/3 text-right px-10">{carrotBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">Corn</div>
        <div className="w-2/3 text-right px-10">{cornBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">Weeds</div>
        <div className="w-2/3 text-right px-10">{weedBalance}</div>
      </div>
    </div>
  )
}

export default Barn
