import BN from 'bn.js'
import { proxy } from 'valtio'

export interface Seed {
  id: string
  name: string
}

interface WalletStore {
  address: string
  plotCurrencyBalance: BN
  ownedSeeds: Seed[]
}

export const walletStore = proxy<WalletStore>({
  address: '',
  plotCurrencyBalance: new BN(0),
  ownedSeeds: [],
})

export const walletActions = {
  setAddress: (address: string) => {
    walletStore.address = address
  },
  setBalance: (balance: BN) => {
    walletStore.plotCurrencyBalance = balance
  },
  // setOwnedSeeds: (seeds: Seed[]) => {
  //   walletStore.ownedSeeds = seeds
  // },
  addOwnedSeed: (seed: Seed) => {
    if (walletStore.ownedSeeds.some((existingSeed) => existingSeed.id === seed.id)) {
      return
    }
    walletStore.ownedSeeds.push(seed)
    const allSeeds = walletStore.ownedSeeds
    localStorage.setItem(`${walletStore.address}.seeds`, JSON.stringify(allSeeds))
  },
  loadOwnedSeed: () => {
    const storedSeeds = localStorage.getItem(`${walletStore.address}.seeds`)
    walletStore.ownedSeeds = JSON.parse(storedSeeds || '[]') as Seed[]
  },
}
