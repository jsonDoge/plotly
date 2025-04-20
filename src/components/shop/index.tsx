import React, { useEffect, useState } from 'react'
import Button from '../button'
import Spinner from '../spinner'
import { buySeed, getSeedBalance } from '../../services/shop'
import { useWallet } from '../../context/wallet'
import { toSentenceCase } from '../../utils'
import { SEED_TYPE, SeedType } from '../../utils/constants'

const Shop = () => {
  const { wallet } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [seedType, setSeedType] = useState<SeedType>(SEED_TYPE.POTATO)
  const [carrotSeedBalance, setCarrotSeedBalance] = useState(0)
  const [potatoSeedBalance, setPotatoSeedBalance] = useState(0)
  const [cornSeedBalance, setCornSeedBalance] = useState(0)

  const refreshBalances = async (walletAddress: string) => {
    getSeedBalance(walletAddress, SEED_TYPE.POTATO).then(setPotatoSeedBalance)
    getSeedBalance(walletAddress, SEED_TYPE.CARROT).then(setCarrotSeedBalance)
    getSeedBalance(walletAddress, SEED_TYPE.CORN).then(setCornSeedBalance)
  }

  const onBuySeed = async () => {
    setError('')
    if (!wallet?.address || !wallet?.privateKey) {
      return
    }
    setIsLoading(true)
    try {
      await buySeed(seedType, wallet?.privateKey)
    } catch (e) {
      setError('Buying failed')
      setIsLoading(false)
      return
    }
    refreshBalances(wallet.address)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!wallet?.address) {
      return
    }

    refreshBalances(wallet.address)
  }, [wallet?.address])

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col text-white w-full">
        <div className="text-2xl">Shop</div>
        <div>(all cost 1USDT)</div>
      </div>
      <div className="flex flex-col w-full mt-5">
        <div className="grid grid-cols-2 items-center w-full">
          <div className="text-left">
            <div>
              <select
                onChange={(e) => {
                  setSeedType(e.target.value as SeedType)
                }}
                value={seedType}
              >
                {Object.values(SEED_TYPE).map((v) => (
                  <option key={v} value={v}>
                    {toSentenceCase(v)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-right">
            {wallet?.address ? (
              <Button onClick={() => onBuySeed()}>
                {!isLoading && <div>Buy seed</div>}
                {isLoading && <Spinner />}
              </Button>
            ) : (
              <Spinner />
            )}
          </div>
        </div>
        <div className="text-center mt-5 bg-black bg-opacity-50">
          {error && <div className="text-red-500">{error}</div>}
        </div>
      </div>
      <div className="flex flex-col text-white w-full mt-5">
        <div className="text-lg">Seeds</div>
        <div>(owned)</div>
      </div>
      <div className="flex flex-row bg-green-200 w-full py-5 rounded-sm">
        <div className="font-bold w-1/3 text-center">Potato seeds</div>
        <div className="w-2/3 text-right px-10">{potatoSeedBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 w-full py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">Carrot seeds</div>
        <div className="w-2/3 text-right px-10">{carrotSeedBalance}</div>
      </div>
      <div className="flex flex-row bg-green-200 w-full py-5 mt-2 rounded-sm">
        <div className="font-bold w-1/3 text-center">Corn seeds</div>
        <div className="w-2/3 text-right px-10">{cornSeedBalance}</div>
      </div>
    </div>
  )
}

export default Shop
