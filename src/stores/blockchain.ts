import { proxy } from 'valtio'

export const blockchainStore = proxy<{
  currentBlock: number
  // newPlotDataAtCenter: {
  //   x: number
  //   y: number
  //   blockNumber: number
  // }
}>()

export const blockchainStoreActions = {
  setCurrentBlock: (currentBlock: number) => {
    blockchainStore.currentBlock = currentBlock
  },
  // setNewPlotDataAtCenter: (x: number, y: number, block: number) => {
  //   blockchainStore.newPlotDataAtCenter = {
  //     x,
  //     y,
  //     blockNumber: block,
  //   }
  // },
}
