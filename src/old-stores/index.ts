import { createStore } from './store'

const walletStore = createStore(undefined)
const mappedPlotInfosStore = createStore(undefined)
const selectPlotStore = createStore(undefined)

export {
  // eslint-disable-next-line import/prefer-default-export
  walletStore,
  mappedPlotInfosStore,
  selectPlotStore,
}
