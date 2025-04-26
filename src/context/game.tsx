import React, { createContext, useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import { useConnection } from '@solana/wallet-adapter-react'

interface IGameContext {}

const GameContext = createContext<IGameContext>({})

// Used a wrapper

const GameContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { connection } = useConnection()

  const gameContext = useMemo(() => ({}), [])

  return <GameContext.Provider value={gameContext}>{children}</GameContext.Provider>
}

GameContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default GameContextProvider
export const useGame = () => useContext(GameContext)
