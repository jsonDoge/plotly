import { Coordinates } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

// Dummy store to trigger change in game from UI (WITHOUT using useState)
export const reloadPlotsAtStore = proxy<{ centerCoords: Coordinates }>({ centerCoords: { x: 0, y: 0 } })

export const reloadPlotsAtActions = {
  reloadAtCenter: (x: number, y: number) => {
    reloadPlotsAtStore.centerCoords = {
      x,
      y,
    }
  },
}
