import { proxy } from 'valtio'

interface TeleportCoordinates {
  x: number
  y: number
  dummy: boolean
}

// Dummy store to trigger change in game from UI (WITHOUT using useState)
export const teleportStore = proxy<{ coords: TeleportCoordinates }>({ coords: { x: 0, y: 0, dummy: false } })

export const teleportActions = {
  teleport: (x: number, y: number) => {
    teleportStore.coords = {
      x,
      y,
      dummy: !!teleportStore.coords.dummy,
    }
  },
}
