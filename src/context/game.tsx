import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { INITIAL_PLOT_CENTER_COORDS, PLOT_SIZE } from '../components/game/utils/constants'
import { PlotInfo } from '../components/game/utils/interfaces'

interface SubscriptionFns {
  submitNewPlotCenter: { (): void }
  selectPlot: { (x: number, y: number, plotInfo: PlotInfo): void }
  uiActionCompleted: { (): void }
  centerChanged: { (x: number, y: number): void }
}

interface IGameContext {
  centerRef: React.MutableRefObject<{ x: number; y: number }>
  submitNewPlotCenter: (x: number, y: number) => void
  subscribeToSubmitNewPlotCenter: (fn: SubscriptionFns['submitNewPlotCenter']) => void
  selectPlot: (x: number, y: number, plotInfo: PlotInfo) => void
  subscribeToSelectPlot: (fn: SubscriptionFns['selectPlot']) => void
  uiActionCompleted: () => void
  subscribeToUiActionCompleted: (fn: SubscriptionFns['uiActionCompleted']) => void
  centerChanged: (x: number, y: number) => void
  subscribeToCenterChanged: (fn: SubscriptionFns['centerChanged']) => void
}

// Currently subscription only supports one subscriber per event
const GameContext = createContext<IGameContext>({
  centerRef: {
    current: {
      x: INITIAL_PLOT_CENTER_COORDS.x * PLOT_SIZE,
      y: INITIAL_PLOT_CENTER_COORDS.y * PLOT_SIZE,
    },
  },
  submitNewPlotCenter: () => {},
  subscribeToSubmitNewPlotCenter: () => {},
  selectPlot: () => {},
  subscribeToSelectPlot: () => {},
  uiActionCompleted: () => {},
  subscribeToUiActionCompleted: () => {},
  centerChanged: () => {},
  subscribeToCenterChanged: () => {},
})

const GameContextProvider = ({ children }: { children: React.ReactNode }) => {
  const centerRef = useRef({
    x: INITIAL_PLOT_CENTER_COORDS.x * PLOT_SIZE,
    y: INITIAL_PLOT_CENTER_COORDS.y * PLOT_SIZE,
  })

  const subscriptionFns = useRef<SubscriptionFns>({
    submitNewPlotCenter: () => {},
    selectPlot: () => {},
    uiActionCompleted: () => {},
    centerChanged: () => {},
  })

  // center teleport input

  const submitNewPlotCenter = useCallback(
    (plotX: number, plotY: number) => {
      const x = plotX * PLOT_SIZE
      const y = plotY * PLOT_SIZE

      centerRef.current = { x, y }

      // TODO: currently not used delete if not used after refactor
      // subscriptionFns.current.submitNewPlotCenter(plotX, plotY);
    },
    [centerRef],
  )

  // TODO: currently not used delete if not used after refactor
  const subscribeToSubmitNewPlotCenter = useCallback(
    (fn: () => void) => {
      subscriptionFns.current.submitNewPlotCenter = fn
    },
    [subscriptionFns],
  )

  // plot click event

  const selectPlot = useCallback(
    (x: number, y: number, plotInfo: PlotInfo) => {
      subscriptionFns.current.selectPlot(x, y, plotInfo)
    },
    [subscriptionFns],
  )

  const subscribeToSelectPlot = useCallback(
    (fn: SubscriptionFns['selectPlot']) => {
      subscriptionFns.current.selectPlot = fn
    },
    [subscriptionFns],
  )

  // ui (modal) action completed

  const uiActionCompleted = useCallback(() => {
    subscriptionFns.current.uiActionCompleted()
  }, [subscriptionFns])

  const subscribeToUiActionCompleted = useCallback(
    (fn: SubscriptionFns['uiActionCompleted']) => {
      subscriptionFns.current.uiActionCompleted = fn
    },
    [subscriptionFns],
  )

  // center change (movement or teleport)

  const centerChanged = useCallback(
    (x: number, y: number) => {
      subscriptionFns.current.centerChanged(x, y)
    },
    [subscriptionFns],
  )

  const subscribeToCenterChanged = useCallback(
    (fn: SubscriptionFns['centerChanged']) => {
      subscriptionFns.current.centerChanged = fn
    },
    [subscriptionFns],
  )

  const gameContext = useMemo(
    () => ({
      centerRef,
      submitNewPlotCenter,
      subscribeToSubmitNewPlotCenter,
      selectPlot,
      subscribeToSelectPlot,
      uiActionCompleted,
      subscribeToUiActionCompleted,
      centerChanged,
      subscribeToCenterChanged,
    }),
    [
      centerRef,
      submitNewPlotCenter,
      subscribeToSubmitNewPlotCenter,
      selectPlot,
      subscribeToSelectPlot,
      uiActionCompleted,
      subscribeToUiActionCompleted,
      centerChanged,
      subscribeToCenterChanged,
    ],
  )

  return <GameContext.Provider value={gameContext}>{children}</GameContext.Provider>
}

GameContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default GameContextProvider
export const useGame = () => useContext(GameContext)
