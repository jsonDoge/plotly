import React, { FC, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { walletStore } from '@/stores/wallet'
import { reloadPlotsAtStore } from '@/stores/reloadPlotsAt'
import { subscribeKey } from 'valtio/utils'
import { useBlockchain } from '../context/blockchain'

// constants

// This is more of an information panel TODO: rename or create separate components
const BlockCounter: FC = () => {
  const { currentBlock } = useBlockchain()
  const balance = useSnapshot(walletStore).plotCurrencyBalance

  const [blockNumber, setBlockNumber] = useState(0)
  const [secondsSinceLastLoad, setSecondsSinceLastLoad] = useState<number>(0)

  const updateBlockAndSeason = useCallback((currentBlockNumber: number) => {
    setBlockNumber(currentBlockNumber)
  }, [])

  useEffect(() => {
    updateBlockAndSeason(currentBlock)
  }, [currentBlock, updateBlockAndSeason])

  useEffect(() => {
    const timeSinceLastLoadIntervalId = setInterval(() => {
      setSecondsSinceLastLoad((s) => s + 1)
    }, 1000)

    const unsubscribeLastReload = subscribeKey(reloadPlotsAtStore, 'lastReload', (_: number) => {
      setSecondsSinceLastLoad(0)
    })

    return () => {
      unsubscribeLastReload()
      clearInterval(timeSinceLastLoadIntervalId)
    }
  }, [])

  return (
    <div className="font-bold mr-5">
      <div className="inline">Current block:</div>
      <div className="inline ml-1">{blockNumber}</div>
      {/* <div>
        <div className="inline">Season:</div>
        <div className="inline ml-1">{`${toSentenceCase(season || '')} ${getSeasonPlantEmojis(season, Object.values(SEED_TYPE))}`}</div>
        <div className="inline mx-1 animate-bounce">{' -> '}</div>
        <div className="inline ml-1">Next Season:</div>
        <div className="inline ml-1">{`${toSentenceCase(nextSeason || '')} ${getSeasonPlantEmojis(nextSeason, Object.values(SEED_TYPE))}`}</div>
      </div> */}
      <div>
        <div className="inline">Farm balance:</div>
        <div className="inline ml-1">{balance.toString()}</div>
      </div>
      <div>
        <div className="inline">Plots reloaded ago:</div>
        <div className="inline ml-1">{secondsSinceLastLoad} s</div>
      </div>
      {/* <div className="">{`Blocks till next season: ${blocksTillNextSeason}`}</div> */}
    </div>
  )
}

export default BlockCounter
