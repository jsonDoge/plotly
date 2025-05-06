import { proxy } from 'valtio'

export enum Route {
  plots = 'plots',
  lab = 'lab',
  kitchen = 'kitchen',
  market = 'market',
  newsBoard = 'newsBoard',
  help = 'help',
  modalShown = 'modalShown',
}

export const appRouteStore = proxy<{
  route: Route
}>({ route: Route.plots })

export const appRouteStoreActions = {
  setCurrentRoute: (route: Route) => {
    appRouteStore.route = route
  },
}
