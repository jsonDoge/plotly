import { MappedPlotInfos, RawPlant, RawPlot } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

export interface RawPlotsAtCenter {
  rawPlots: RawPlot[]
  rawPlants: RawPlant[]
  outerRawPlots: RawPlot[]
  centerX: number
  centerY: number
}

interface WrappedPlotInfos {
  // center is updated upon raw plot change
  map: MappedPlotInfos
  rawPlotsAtCenter: RawPlotsAtCenter
}

export const mappedPlotInfosStore = proxy<WrappedPlotInfos>()

export const mappedPlotInfosActions = {
  setPlotInfos: (mpi: MappedPlotInfos) => {
    mappedPlotInfosStore.map = mpi
  },
  setRawPlotsAndPlants: (centerX: number, centerY: number, rawPlots: RawPlot[], rawPlants: RawPlant[], outerRawPlots: RawPlot[]) => {
    mappedPlotInfosStore.rawPlotsAtCenter = {
      centerX,
      centerY,
      rawPlots,
      rawPlants,
      outerRawPlots,
    }
  },
}
