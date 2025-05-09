import React, { Suspense, useEffect, useState } from 'react'
import '@fortawesome/fontawesome-svg-core/styles.css'
// eslint-disable-next-line import/no-extraneous-dependencies
import 'tailwindcss/tailwind.css'
// import dynamic from 'next/dynamic'
// import WalletContextProvider from '../context/wallet'
import Game from '@/components/game'
// import { useConnection } from '@solana/wallet-adapter-react'
import GameProvider from '../context/game'
import BlockchainProvider from '../context/blockchain'
// import { ClusterProvider } from '../context/cluster'
import { SolanaProvider } from '../context/solana'
import { ReactQueryProvider } from '../context/react-query'
import ErrorProvider from '../context/error'
import Layout from '../components/layout'
import Spinner from '../components/utils/spinner'

// const Game = dynamic(() => import('../components/game'), { suspense: true, ssr: false })

function MyApp() {
  const [, setMounted] = useState(false)
  // should help disable server side rendering
  useEffect(() => setMounted(true), [])

  return (
    <>
      <ReactQueryProvider>
        <SolanaProvider>
          <BlockchainProvider>
            <GameProvider>
              <ErrorProvider>
                <Layout />
              </ErrorProvider>
            </GameProvider>
          </BlockchainProvider>
        </SolanaProvider>
      </ReactQueryProvider>
      <div className="absolute top-0 z-10 h-screen w-screen">
        <Game />
      </div>
    </>
  )
}

export default MyApp
