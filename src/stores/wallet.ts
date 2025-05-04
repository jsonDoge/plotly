import BN from 'bn.js'
import { proxy } from 'valtio'

interface WalletStore {
  address: string
  plotCurrencyBalance: BN
}

export const walletStore = proxy<WalletStore>({
  address: '',
  plotCurrencyBalance: new BN(0),
})

export const walletActions = {
  setAddress: (address: string) => {
    walletStore.address = address
  },
  setBalance: (balance: BN) => {
    walletStore.plotCurrencyBalance = balance
  },
}
