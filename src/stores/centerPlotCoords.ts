import { Coordinates } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

export const centerPlotCoordsStore = proxy<{ coords: Coordinates }>({ coords: { x: 3, y: 3 } })

export const centerPlotCoordsActions = {
  setCenterPlotCoords: (x: number, y: number) => {
    centerPlotCoordsStore.coords = {
      x,
      y,
    }
  },
}
