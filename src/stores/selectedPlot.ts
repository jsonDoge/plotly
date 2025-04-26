import { PlotInfo } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

interface SelectedPlot {
  x: number
  y: number
  plotInfo: PlotInfo
}

export const selectedPlotStore = proxy<SelectedPlot>()

export const selectedPlotActions = {
  setSelectedPlot: (x: number, y: number, plotInfo: PlotInfo) => {
    selectedPlotStore.x = x
    selectedPlotStore.y = y
    selectedPlotStore.plotInfo = plotInfo
  },
}
