import { MappedPlotInfos } from '@/components/game/utils/interfaces'
import { proxy } from 'valtio'

interface WrappedPlotInfos {
  map: MappedPlotInfos
}

export const mappedPlotInfosStore = proxy<WrappedPlotInfos>()

export const mappedPlotInfosActions = {
  setPlotInfos: (mpi: MappedPlotInfos) => {
    mappedPlotInfosStore.map = mpi
  },
}
