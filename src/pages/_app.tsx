import React, { Suspense } from 'react'
import '@fortawesome/fontawesome-svg-core/styles.css'
// eslint-disable-next-line import/no-extraneous-dependencies
import 'tailwindcss/tailwind.css'
import dynamic from 'next/dynamic'
// import WalletContextProvider from '../context/wallet'
import Game from '@/components/game'
import GameProvider from '../context/game'
import BlockchainProvider from '../context/blockchain'
import { ClusterProvider } from '../context/cluster'
import { SolanaProvider } from '../context/solana'
import { ReactQueryProvider } from '../context/react-query'
import ErrorProvider from '../context/error'
import Layout from '../components/layout'
import Spinner from '../components/spinner'

// const Game = dynamic(() => import('../components/game'), { suspense: true, ssr: false })

function MyApp() {
  return (
    <>
      <ReactQueryProvider>
        <ClusterProvider>
          <SolanaProvider>
            <BlockchainProvider>
              {/*    <WalletContextProvider> */}
              <GameProvider>
                <>
                  {/* <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-screen">
                        <Spinner className="h-10 w-10" />
                      </div>
                    }
                  > */}
                  {/* </Suspense> */}
                  <div className="absolute z-10 h-screen w-screen">
                    <ErrorProvider>
                      <Layout />
                    </ErrorProvider>
                  </div>
                </>
              </GameProvider>
              {/* </WalletContextProvider> */}
            </BlockchainProvider>
          </SolanaProvider>
        </ClusterProvider>
      </ReactQueryProvider>
      <div className="z-10 h-screen w-screen">
        <Game />
      </div>
    </>
  )
}

export default MyApp
