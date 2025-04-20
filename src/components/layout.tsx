import React, { useEffect, useState } from 'react'
import Head from 'next/head'
// import { Analytics } from '@vercel/analytics/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'

// import { useWallet } from '../context/wallet'
import BlockCounter from './blockCounter'
// import PlotActionModals from './plotActionModals'
// import Barn from './barn'
// import Shop from './shop'
// import Bank from './bank'
import CenterPlotNavigator from './plots/centerPlotNavigator'
import CenterPlotCoordsDisplay from './plots/centerPlotCoordsDisplay'
// import Kitchen from './kitchen'
import Help from './help'
import ChainName from './chainName'
import WalletIntroModal from './walletIntroModal'

const Layout: React.FC = () => {
  // const { wallet, walletIntroShown, markWalletIntroAsShown } = useWallet()
  const [tab, setTab] = useState('plots')
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isBtnUpPressed, setIsBtnUpPressed] = useState(false)
  const [isBtnRightPressed, setIsBtnRightPressed] = useState(false)
  const [isBtnDownPressed, setIsBtnDownPressed] = useState(false)
  const [isBtnLeftPressed, setIsBtnLeftPressed] = useState(false)
  const [isWalletIntroModalShown, setIsWalletIntroModalShown] = useState(false)

  // useEffect(() => {
  //   setIsWalletIntroModalShown(!walletIntroShown)
  // }, [walletIntroShown])

  return (
    <div className="flex flex-col h-screen">
      <Head>
        <title>T2 Farm</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="grid grid-cols-2 lg:grid-cols-3 z-20 px-6 py-3 border-bottom bg-transparent">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-white">T2 farm</h1>
          <div className="text-left text-white hidden lg:block">
            <BlockCounter />
            {/* <div className="font-bold">
              <span onClick={() => navigator.clipboard.writeText(wallet?.address || '')} role="button" tabIndex={0}>
                {`Wallet: 0x... ${wallet?.address.slice(-4)}`}
              </span>
            </div> */}
          </div>
        </div>
        <div className="block text-right text-white lg:hidden">
          <button
            type="button"
            className="px-3 py-1 border rounded duration-300 ease-in-out hover:text-white hover:bg-gray"
            aria-label="Menu"
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>
        <div className="flex flex-row justify-center items-start pt-2 font-bold text-white hidden lg:flex">
          <div className={`px-2 rounded-sm ${tab === 'plots' && 'bg-green-200 text-black'}`}>
            <span role="button" onClick={() => setTab('plots')} tabIndex={0} className="text-bold">
              Plots
            </span>
          </div>
          <div className={`px-2 rounded-sm ${tab === 'shop' && 'bg-green-200 text-black'}`}>
            <span role="button" onClick={() => setTab('shop')} tabIndex={0} className="text-bold">
              Shop
            </span>
          </div>
          {/* <div className={`px-2 rounded-sm ${tab === 'barn' && 'bg-green-200 text-black'}`}>
            <span role="button" onClick={() => setTab('barn')} tabIndex={0} className="text-bold">
              Barn
            </span>
          </div> */}
          <div className={`px-2 rounded-sm ${tab === 'kitchen' && 'bg-green-200 text-black'}`}>
            <span role="button" onClick={() => setTab('kitchen')} tabIndex={0} className="text-bold">
              Kitchen
            </span>
          </div>
          <div className={`px-2 rounded-sm ${tab === 'bank' && 'bg-green-200 text-black'}`}>
            <span role="button" onClick={() => setTab('bank')} tabIndex={0} className="text-bold">
              Bank
            </span>
          </div>
          <div className={`px-2 rounded-sm ${tab === 'help' && 'bg-green-200 text-black'}`}>
            <span role="button" onClick={() => setTab('help')} tabIndex={0} className="text-bold">
              Help
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-right text-white hidden lg:block">
            <ChainName />
          </div>
        </div>
        {/* MOBILE MENU */}
        <div className="relative w-full col-span-2">
          <div
            className={`absolute w-full mt-5 block bg-black bg-opacity-50 lg:flex lg:items-center lg:w-auto lg:hidden ${isNavOpen ? '' : 'hidden'}`}
          >
            <div className="text-center text-white">
              <BlockCounter />
              {/* <div className="font-bold">
                <span onClick={() => navigator.clipboard.writeText(wallet?.address || '')} role="button" tabIndex={0}>
                  {`Wallet: 0x...${wallet?.address.slice(-4)}`}
                </span>
              </div> */}
            </div>
            <div className="w-full my-1 h-[1px] bg-white" />
            <div className="flex flex-col text-center text-lg pt-2 font-bold text-white">
              <div className={`px-2 rounded-sm ${tab === 'plots' && 'bg-green-200 text-black'}`}>
                <span
                  role="button"
                  onClick={() => {
                    setTab('plots')
                    setIsNavOpen(false)
                  }}
                  tabIndex={0}
                  className="text-bold"
                >
                  Plots
                </span>
              </div>
              <div className={`px-2 rounded-sm ${tab === 'shop' && 'bg-green-200 text-black'}`}>
                <span
                  role="button"
                  onClick={() => {
                    setTab('shop')
                    setIsNavOpen(false)
                  }}
                  tabIndex={0}
                  className="text-bold"
                >
                  Shop
                </span>
              </div>
              <div className={`px-2 rounded-sm ${tab === 'barn' && 'bg-green-200 text-black'}`}>
                <span
                  role="button"
                  onClick={() => {
                    setTab('barn')
                    setIsNavOpen(false)
                  }}
                  tabIndex={0}
                  className="text-bold"
                >
                  Barn
                </span>
              </div>
              <div className={`px-2 rounded-sm ${tab === 'kitchen' && 'bg-green-200 text-black'}`}>
                <span
                  role="button"
                  onClick={() => {
                    setTab('kitchen')
                    setIsNavOpen(false)
                  }}
                  tabIndex={0}
                  className="text-bold"
                >
                  Kitchen
                </span>
              </div>
              <div className={`px-2 rounded-sm ${tab === 'bank' && 'bg-green-200 text-black'}`}>
                <span
                  role="button"
                  onClick={() => {
                    setTab('bank')
                    setIsNavOpen(false)
                  }}
                  tabIndex={0}
                  className="text-bold"
                >
                  Bank
                </span>
              </div>
              <div className={`px-2 rounded-sm ${tab === 'help' && 'bg-green-200 text-black'}`}>
                <span
                  role="button"
                  onClick={() => {
                    setTab('help')
                    setIsNavOpen(false)
                  }}
                  tabIndex={0}
                  className="text-bold"
                >
                  Help
                </span>
              </div>
            </div>
            <div className="w-full my-1 h-[1px] bg-white" />
            <div className="text-left ml-3 text-white">Teleport to:</div>
            <div className="lg:hidden mx-3 pb-3">
              <CenterPlotNavigator isMobile />
            </div>
          </div>
        </div>
      </header>
      <div className="z-20">{/* <PlotActionModals /> */}</div>
      <div
        className={`z-10 grow bg-transparent ${isNavOpen || tab === 'plots' ? 'hidden' : 'flex flex-col'} lg:mx-0 overflow-y-auto items-center`}
      >
        {/* {tab === 'barn' && (
          <div className="px-3 flex grow flex-col justify-center w-full lg:w-96 lg:justify-start">
            <Barn />
          </div>
        )} */}
        {/* {tab === 'kitchen' && (
          <div className="px-3 flex grow flex-col justify-center w-full lg:w-96 lg:justify-start">
            <Kitchen />
          </div>
        )} */}
        {/* {tab === 'shop' && (
          <div className="px-3 flex grow flex-col justify-center w-full lg:w-96 lg:justify-start">
            <Shop />
          </div>
        )} */}
        {/* {tab === 'bank' && (
          <div className="px-3 flex grow flex-col justify-center w-full lg:w-96 lg:justify-start">
            <Bank />
          </div>
        )} */}
        {tab === 'help' && (
          <div className="px-3 flex grow flex-col justify-center w-full lg:w-96 lg:justify-start">
            <Help />
          </div>
        )}
      </div>
      {tab === 'plots' && (
        <div className="absolute grid grid-cols-2 z-10 lg:bottom-10 bottom-2 w-full">
          <div className="flex flex-col text-left pl-5 lg:pl-0 lg:text-center justify-end items-start lg:items-center lg:col-span-2">
            <CenterPlotCoordsDisplay />
            <div className="hidden lg:block">
              <CenterPlotNavigator />
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:hidden text-right pr-1">
            <button
              type="button"
              tabIndex={0}
              onContextMenu={(e) => e.preventDefault()}
              className={`${isBtnUpPressed ? 'bg-white' : ''} select-none bg-black bg-opacity-50 border-x border-t border-white border-opacity-50 col-start-2 md:col-start-4 col-span-1 text-white text-3xl py-3 px-5 lg:px-1 text-center`}
              onTouchStart={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
                setIsBtnUpPressed(true)
              }}
              onTouchEnd={() => {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))
                setIsBtnUpPressed(false)
              }}
            >
              ↑
            </button>
            <button
              type="button"
              tabIndex={-1}
              onContextMenu={(e) => e.preventDefault()}
              className={`${isBtnLeftPressed ? 'bg-white' : ''} select-none bg-black bg-opacity-50 border-y border-l border-white border-opacity-50 col-start-1 md:col-start-3 text-white text-3xl py-3 px-5 text-center cursor-pointer`}
              onTouchStart={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))
                setIsBtnLeftPressed(true)
              }}
              onTouchEnd={() => {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }))
                setIsBtnLeftPressed(false)
              }}
            >
              ←
            </button>
            <button
              type="button"
              tabIndex={-2}
              onContextMenu={(e) => e.preventDefault()}
              className={`${isBtnDownPressed ? 'bg-white' : ''} select-none bg-black bg-opacity-50 border border-white border-opacity-50 text-white text-3xl py-3 px-5 text-center cursor-pointer`}
              onTouchStart={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }))
                setIsBtnDownPressed(true)
              }}
              onTouchEnd={() => {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }))
                setIsBtnDownPressed(false)
              }}
            >
              ↓
            </button>
            <button
              type="button"
              tabIndex={-3}
              onContextMenu={(e) => e.preventDefault()}
              className={`${isBtnRightPressed ? 'bg-white' : ''} select-none bg-black bg-opacity-50 border-y border-r border-white border-opacity-50  text-white text-3xl py-3 px-5 text-center`}
              onTouchStart={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }))
                setIsBtnRightPressed(true)
              }}
              onTouchEnd={() => {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }))
                setIsBtnRightPressed(false)
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
      {/* <Analytics /> */}
      {isWalletIntroModalShown && (
        <WalletIntroModal
          walletAddress={wallet?.address || ''}
          onConfirm={() => {
            setIsWalletIntroModalShown(false)
            markWalletIntroAsShown()
          }}
        />
      )}
    </div>
  )
}

export default Layout
