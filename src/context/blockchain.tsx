import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useConnection } from '@solana/wallet-adapter-react'

interface IBlockchainContext {
  currentBlock: number
}

// Currently subscription only supports one subscriber per event
const BlockchainContext = createContext<IBlockchainContext>({
  currentBlock: 0,
})

const BlockchainContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentBlock, setCurrentBlock] = useState<number>(0)
  const { connection } = useConnection()

  const loadBlockchainInfo = () => {
    connection.getBlockHeight().then((blockNumber) => {
      console.log(blockNumber)
      setCurrentBlock(Number(blockNumber))
    })
  }

  useEffect(() => {
    loadBlockchainInfo()

    const intervalId = setInterval(() => {
      loadBlockchainInfo()
    }, 60000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const blockchainContextValue = useMemo(() => ({ currentBlock }), [currentBlock])
  // TODO: investigate if such value context doesn't cause performance issues
  return <BlockchainContext.Provider value={blockchainContextValue}> {children} </BlockchainContext.Provider>
}

BlockchainContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default BlockchainContextProvider
export const useBlockchain = () => useContext(BlockchainContext)
