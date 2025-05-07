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
    const parsedSeeds = JSON.parse(storedSeeds || '[]')

    const addedSeeds: string[] = []
    const uniqueSeeds = parsedSeeds
      .map((seed: Seed) => {
        if (!addedSeeds.includes(seed.id)) {
          addedSeeds.push(seed.id)
          return seed
        }
        return null
      })
      .filter((seed: Seed | null) => seed !== null)

    if (uniqueSeeds.length !== parsedSeeds.length) {
      localStorage.setItem(`${walletStore.address}.seeds`, JSON.stringify(uniqueSeeds))
    }

    walletStore.ownedSeeds = uniqueSeeds as Seed[]
  },
}
