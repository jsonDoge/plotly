import { proxy } from 'valtio'

interface WalletStore {
  address: string
}

export const walletStore = proxy<WalletStore>({
  address: '',
})

export const walletActions = {
  setAddress: (address: string) => {
    walletStore.address = address
  },
}
