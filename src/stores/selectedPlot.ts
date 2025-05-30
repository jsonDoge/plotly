import { PlotInfo } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

export interface SelectedPlot {
  x: number
  y: number
  plotInfo: PlotInfo
}

export const selectedPlotStore = proxy<{ plot: SelectedPlot }>()

export const selectedPlotActions = {
  setSelectedPlot: (x: number, y: number, plotInfo: PlotInfo) => {
    selectedPlotStore.plot = { x, y, plotInfo }
  },
}
