import { MappedPlotInfos, RawPlot } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

export interface RawPlotsAtCenter {
  rawPlots: RawPlot[]
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
  setRawPlots: (centerX: number, centerY: number, rawPlots: RawPlot[]) => {
    mappedPlotInfosStore.rawPlotsAtCenter = {
      centerX,
      centerY,
      rawPlots,
    }
  },
}
