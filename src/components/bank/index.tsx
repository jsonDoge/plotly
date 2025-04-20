import React, { useEffect, useState } from 'react'
import { mintStableToken, getStableTokenBalance } from '../../services/bank'
import { useWallet } from '../../context/wallet'
import Button from '../button'
import Spinner from '../spinner'

const Bank = () => {
  const { wallet } = useWallet()
  const [balance, setbalance] = useState(0)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getLoan = async () => {
    setError('')
    if (!wallet?.address || !wallet?.privateKey) {
      return
    }
    setIsLoading(true)
    try {
      await mintStableToken(wallet.address, wallet.privateKey)
    } catch (e) {
      setError('Buying failed')
      setIsLoading(false)
      return
    }
    await getStableTokenBalance(wallet.address).then(setbalance)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!wallet?.address) {
      return
    }

    getStableTokenBalance(wallet.address).then(setbalance)
  }, [wallet?.address])

  return (
    <div className="flex flex-col w-full">
      <div className="text-left">
        <div className="text-2xl text-white">Bank</div>
      </div>
      <div className="flex flex-col w-full mt-5">
        <div className="text-right">
          {wallet?.address ? (
            <Button disabled={isLoading} onClick={() => getLoan()}>
              {!isLoading && <div>Get farmers loan</div>}
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
      <div className="flex flex-col text-white w-full mt-5">
        <div>(owned)</div>
      </div>
      <div className="flex flex-row w-full bg-green-200 py-5 rounded-sm">
        <div className="font-bold w-1/3 text-center">USDT</div>
        <div className="w-2/3 text-right px-10">{balance}</div>
      </div>
    </div>
  )
}

export default Bank
