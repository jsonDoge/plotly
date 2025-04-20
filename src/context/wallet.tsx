import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react'
import { Wallet as EtherWallet } from 'ethers'
import PropTypes from 'prop-types'
import { walletStore } from '../stores'
import { Wallet } from '../utils/interfaces'

interface IWalletContext {
  wallet: Wallet | undefined
  walletIntroShown: boolean
  markWalletIntroAsShown: () => void
}

const WalletContext = createContext<IWalletContext>({
  wallet: undefined,
  walletIntroShown: false,
  markWalletIntroAsShown: () => {},
})

const getWallet = () => {
  const address = window.localStorage.getItem('wallet:address')
  const privateKey = window.localStorage.getItem('wallet:key')

  if (!address || !privateKey) {
    return undefined
  }

  return { address: address.toLowerCase(), privateKey }
}

const getWalletIntroShown = () => {
  const walletIntroShown = window.localStorage.getItem('walletIntroShown')

  if (!walletIntroShown) {
    return false
  }

  return walletIntroShown === 'true'
}

const saveWalletIntroShown = () => {
  window.localStorage.setItem('walletIntroShown', 'true')
}

const saveWallet = (address: string, privateKey: string) => {
  window.localStorage.setItem('wallet:address', address)
  window.localStorage.setItem('wallet:key', privateKey)
}

const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [localWallet, setLocalWallet] = useState<Wallet>()
  const [walletIntroShown, setWalletIntroShown] = useState<boolean>(false)

  const loadWallet = () => {
    let wallet: EtherWallet
    const existingWallet: Wallet | undefined = getWallet()

    if (!existingWallet) {
      wallet = EtherWallet.createRandom()
      const formattedWallet = {
        address: wallet.address.toLowerCase(),
        privateKey: wallet.privateKey,
      }

      saveWallet(formattedWallet.address, formattedWallet.privateKey)
      setLocalWallet({ ...formattedWallet })

      walletStore.setValue({ ...formattedWallet })
    } else {
      setLocalWallet((currentWallet) => currentWallet || { ...existingWallet })
      walletStore.setValue({ ...existingWallet })
    }
  }

  const markWalletIntroAsShown = useCallback(() => {
    if (walletIntroShown) {
      return
    }

    setWalletIntroShown(true)
    saveWalletIntroShown()
  }, [walletIntroShown])

  useEffect(() => {
    loadWallet()
    setWalletIntroShown(getWalletIntroShown())
  }, [])

  const walletContextValue = useMemo(
    () => ({ wallet: localWallet, walletIntroShown, markWalletIntroAsShown }),
    [localWallet, walletIntroShown, markWalletIntroAsShown],
  )

  return <WalletContext.Provider value={walletContextValue}>{children}</WalletContext.Provider>
}

WalletContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default WalletContextProvider
export const useWallet = () => useContext(WalletContext)
