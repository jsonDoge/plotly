import { proxy } from 'valtio'

export const blockchainStore = proxy<{ currentBlock: number }>()

export const blockchainStoreActions = {
  setBlockchain: (currentBlock: number) => {
    blockchainStore.currentBlock = currentBlock
  },
}
