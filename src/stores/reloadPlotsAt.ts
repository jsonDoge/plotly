import { Coordinates } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

// Dummy store to trigger change in game from UI (WITHOUT using useState)
export const reloadPlotsAtStore = proxy<{ centerCoords: Coordinates; lastReload: number }>({
  centerCoords: { x: 0, y: 0 },
  lastReload: new Date().getTime(),
})

export const reloadPlotsAtActions = {
  reloadAtCenter: (x: number, y: number) => {
    reloadPlotsAtStore.centerCoords = {
      x,
      y,
    }
    reloadPlotsAtStore.lastReload = new Date().getTime()
  },
  reloadSameCoords: () => {
    reloadPlotsAtStore.centerCoords = {
      x: reloadPlotsAtStore.centerCoords.x,
      y: reloadPlotsAtStore.centerCoords.y,
    }
    reloadPlotsAtStore.lastReload = new Date().getTime()
  },
}
