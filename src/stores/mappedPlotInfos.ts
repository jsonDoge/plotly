import { MappedPlotInfos, RawPlot } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

export interface RawPlotsAtCenter {
  farmRawPlots: RawPlot[]
  userRawPlots: RawPlot[]
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
  setRawPlots: (centerX: number, centerY: number, farmRawPlots: RawPlot[], userRawPlots: RawPlot[]) => {
    mappedPlotInfosStore.rawPlotsAtCenter = {
      centerX,
      centerY,
      farmRawPlots,
      userRawPlots,
    }
  },
}
