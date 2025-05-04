import getConfig from 'next/config'
// import { BigNumber } from 'ethers'
// import { getGrowthBlockDuration, getPlantState } from '../../../services/farm'
// import { SEED_TYPE } from '../../../utils/constants'
import { mapRawPlotOwnership } from '@/services/web3Utils'
import { PublicKey } from '@solana/web3.js'
import { Coordinates, MappedPlotInfos, RawPlant, RawPlot } from './interfaces'
import { getDefaultPlotColor, getPlotColor } from './plotColors'
import { PlantState, PlotBalanceState, PlotWaterRegenerationState, PlotWaterState } from '@/utils/enums'
import { BN } from 'bn.js'

const { publicRuntimeConfig } = getConfig()

const MAX_PLOT_WATER = parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10)
const PLOT_MAX_X = parseInt(publicRuntimeConfig.PLOT_AREA_MAX_X, 10)
const PLOT_MAX_Y = parseInt(publicRuntimeConfig.PLOT_AREA_MAX_Y, 10)
const PLOT_REGEN_RATE = parseInt(publicRuntimeConfig.PLOT_WATER_REGEN_RATE, 10)

// all info are in relation to single plot/plant combo
// returns:
// - plant water absorbed from plot
// - plot current water level
const estimatePlantAndPlotWater = (
  plotWater: number,
  plotBaseWaterRegen: number,
  plotTotalWaterDrainRate: number,

  plantWaterDrainRate: number,

  blocksPassed: number,
): [number, number] => {

  const plotMaxWater = parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10)
  const PLOT_30_THREASHOLD = parseInt(publicRuntimeConfig.PLOT_WATER_30_THRESHOLD, 10)
  const PLOT_10_THREASHOLD = parseInt(publicRuntimeConfig.PLOT_WATER_10_THRESHOLD, 10)

  
  if (blocksPassed === 0) {
    return [0, plotWater]
  }

  // base regen at 100%
  if (plotWater > PLOT_30_THREASHOLD) {
    const plotWaterRegen = plotBaseWaterRegen - plotTotalWaterDrainRate

    // plot is gaining/unchanging water
    if (plotWaterRegen >= 0) {
      return [
        plantWaterDrainRate * blocksPassed,
        Math.min(plotWater + plotWaterRegen * blocksPassed, plotMaxWater),
      ]
    }
    
    const blocksAbove30Threashold = Math.ceil(plotWater - PLOT_30_THREASHOLD / Math.abs(plotWaterRegen))

    // plot losing water but stays above 30% water
    if (blocksAbove30Threashold > blocksPassed) {
      return [
        plantWaterDrainRate * blocksPassed,
        plotWater - Math.abs(plotWaterRegen) * blocksPassed,
      ]
    }

    // water drops below 30% water
    const newPlotWaterLevel = plotWater - Math.abs(plotWaterRegen) * blocksAbove30Threashold

    const waterFromLowerLevel = estimatePlantAndPlotWater(
      newPlotWaterLevel,
      plotBaseWaterRegen,
      plotTotalWaterDrainRate,

      plantWaterDrainRate,
      blocksPassed - blocksAbove30Threashold,
    )

    return [
      plantWaterDrainRate * blocksAbove30Threashold + waterFromLowerLevel[0],
      waterFromLowerLevel[1],
    ]
  }


  // base regen at 70% (water level below 30%)
  if (plotWater > PLOT_10_THREASHOLD && plotWater <= PLOT_30_THREASHOLD) {
    const plotWaterRegen = Math.floor(plotBaseWaterRegen * 0.7) - plotTotalWaterDrainRate

    // plot is unchanging water
    if (plotWaterRegen == 0) {
      return [
        plantWaterDrainRate * blocksPassed,
        plotWater,
      ]
    }

    // plot is gaining water
    if (plotWaterRegen > 0) {
      const blocksUntil30Threashold = Math.ceil(((PLOT_30_THREASHOLD + 1) - plotWater) / plotWaterRegen)

      if (blocksUntil30Threashold > blocksPassed) {
        return [
          plantWaterDrainRate * blocksPassed,
          plotWater + plotWaterRegen * blocksPassed,
        ]
      }

      // water goes above 30% water (back to 100% regen)
      const newPlotWaterLevel = plotWater + plotWaterRegen * blocksUntil30Threashold
      const waterFromHigherLevel = estimatePlantAndPlotWater(
        newPlotWaterLevel,
        plotBaseWaterRegen,
        plotTotalWaterDrainRate,

        plantWaterDrainRate,
        blocksPassed - blocksUntil30Threashold,
      )

      return [
        plantWaterDrainRate * blocksUntil30Threashold + waterFromHigherLevel[0],
        waterFromHigherLevel[1],
      ]
    }

    // plot is losing water

    const blocksAbove10Threashold = Math.ceil((plotWater - PLOT_10_THREASHOLD) / Math.abs(plotWaterRegen))

    // plot losing water but stays above 10% water
    if (blocksAbove10Threashold > blocksPassed) {
      return [
        plantWaterDrainRate * blocksPassed,
        plotWater - Math.abs(plotWaterRegen) * blocksPassed,
      ]
    }

    // water drops below 10% water
    const newPlotWaterLevel = plotWater - Math.abs(plotWaterRegen) * blocksAbove10Threashold

    const waterFromLowerLevel = estimatePlantAndPlotWater(
      newPlotWaterLevel,
      plotBaseWaterRegen,
      plotTotalWaterDrainRate,

      plantWaterDrainRate,
      blocksPassed - blocksAbove10Threashold,
    )

    return [
      plantWaterDrainRate * blocksAbove10Threashold + waterFromLowerLevel[0],
      waterFromLowerLevel[1],
    ]
  }


  // base regen at 50% (water level below 10%)
  if (plotWater <= PLOT_10_THREASHOLD) {
    const newBaseWaterRegen = Math.floor(plotBaseWaterRegen * 0.5)
    const plotWaterRegen = newBaseWaterRegen - plotTotalWaterDrainRate

    // equalibrium
    if (plotWaterRegen == 0) {    
      return [
        plantWaterDrainRate * blocksPassed,
        plotWater,
      ]
    }

    if (plotWaterRegen > 0) {
      // plot is gaining water
      const blocksUntil10Threashold = Math.ceil(((PLOT_10_THREASHOLD + 1) - plotWater) / plotWaterRegen)

      // water is gaining but stays below 10% water
      if (blocksUntil10Threashold > blocksPassed) {
        return [
          plantWaterDrainRate * blocksPassed,
          plotWater + plotWaterRegen * blocksPassed,
        ]
      }

      // water goes above 10% water (back to 70% regen)
      const newPlotWaterLevel = plotWater + plotWaterRegen * blocksUntil10Threashold


      const waterFromHigherLevel = estimatePlantAndPlotWater(
        newPlotWaterLevel,
        plotBaseWaterRegen,
        plotTotalWaterDrainRate,

        plantWaterDrainRate,
        blocksPassed - blocksUntil10Threashold,
      )

      return [
        plantWaterDrainRate * blocksUntil10Threashold + waterFromHigherLevel[0],
        waterFromHigherLevel[1],
      ]
    }

    // water is negative and can reach bone dry

    const fullBlocksLeft = Math.floor(plotWater / Math.abs(plotWaterRegen))

    if (fullBlocksLeft >= blocksPassed) {
      return [
        plantWaterDrainRate * blocksPassed,
        plotWater - Math.abs(plotWaterRegen) * blocksPassed,
      ]
    }

    const waterRegeneratedAfterFullBlocks = plotWater - (fullBlocksLeft * Math.abs(plotWaterRegen)) + (blocksPassed - fullBlocksLeft) * newBaseWaterRegen
    const blocksWorthOfWaterAbsorbed = Math.floor(waterRegeneratedAfterFullBlocks / plantWaterDrainRate)

    const waterLeft = waterRegeneratedAfterFullBlocks - blocksWorthOfWaterAbsorbed * plantWaterDrainRate

    return [
      (blocksWorthOfWaterAbsorbed + fullBlocksLeft) * plantWaterDrainRate,
      plotWater - (fullBlocksLeft * Math.abs(plotWaterRegen)) + waterLeft,
    ]
  }

  throw new Error(`Invalid plot water level ${plotWater})`)
}

// TODO: function is growing too big, refactor
// TODO: move this to blockchain once water is implemented
export const reduceProgramPlots = (
  rawPlots: RawPlot[], // 49 plots
  rawPlants: RawPlant[], // 49 plants (match 1:1 with plots)
  outerRawPlots: RawPlot[], // outer border 28 plots in order (-Y, +Y, -X, +X)
  currentBlock: number,
  walletAddress: PublicKey,

  // actual plot coordinates
  absoluteCornerX: number,
  absoluteCornerY: number,
): MappedPlotInfos =>
  rawPlots.reduce((mp: MappedPlotInfos, rawPlot: RawPlot, i) => {
    const mapPlotCoords = { x: i % 7, y: Math.floor(i / 7) }
    const coords = { x: mapPlotCoords.x + absoluteCornerX, y: mapPlotCoords.y + absoluteCornerY }

    const updatedMp = {
      ...mp,
      [mapPlotCoords.x]: {
        ...mp[mapPlotCoords.x],
      },
    }

    if (rawPlot.data && rawPlot.data?.centerPlantDrainRate !== 0) {
      console.log('center non zero rawPlot', rawPlot)
    }
    // TODO: water not yet implemented

    // const lastKnownPlotWaterLevel = plot.waterLog?.level?.toNumber() || parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10)
    // const lastKnownPlotWaterChange = plot.waterLog?.changeRate?.toNumber() || 0

    // const centerPlotBlockDiff = currentBlock - (plot.waterLog?.blockNumber?.toNumber() || 0)
    // // if block diff is negative, it means the game has not updated to the latest block yet
    // const centerPlotBlocksPassed = centerPlotBlockDiff < 0 ? 0 : centerPlotBlockDiff

    // const currentPlotWaterLevel = estimatePlotWaterLevel(
    //   lastKnownPlotWaterLevel,
    //   lastKnownPlotWaterChange,
    //   centerPlotBlocksPassed,
    // )

    // manual calculations until current block
    // if (plot.owner === '0x0000000000000000000000000000000000000000') {

    const plotOwnership = mapRawPlotOwnership(walletAddress, rawPlot)
    const plot = rawPlot.data;

    if (plotOwnership.isUnminted || !plot) {
      updatedMp[mapPlotCoords.x][mapPlotCoords.y] = {
        isOwner: false,
        isPlantOwner: false,
        isFarmOwner: false,
        isUnminted: true,

        // plant
        plant: null,
        
        // plot states
        waterState: PlotWaterState.GOOD,
        waterRegenerationState: PlotWaterRegenerationState.REGENERATING,
        balanceState: PlotBalanceState.CAN_BE_REVOKED,

        centerPlantDrainRate: 0,
        centerPlantWaterCollected: 0,
        leftPlantDrainRate: 0,
        leftPlantWaterCollected: 0,
        rightPlantDrainRate: 0,
        rightPlantWaterCollected: 0,
        upPlantDrainRate: 0,
        upPlantWaterCollected: 0,
        downPlantDrainRate: 0,
        downPlantWaterCollected: 0,

        // stats
        lastStateUpdateBlock: 0,
        balance: new BN(0),
        waterLevel: parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10),
        waterRegen: 90, // currently always 90

        // plot
        color: getPlotColor(plotOwnership.isFarmOwner, plotOwnership.isOwner, plotOwnership.isPlantOwner, plotOwnership.isUnminted),
        opacity: 0.5,
      }

      return updatedMp
    }

    const plotWater30Threashold = parseInt(publicRuntimeConfig.PLOT_WATER_30_THRESHOLD, 10)
    const plotWater10Threashold = parseInt(publicRuntimeConfig.PLOT_WATER_10_THRESHOLD, 10)

    const waterState = plot.water > plotWater30Threashold ?
      PlotWaterState.GOOD :
      plot.water > plotWater10Threashold ?
        PlotWaterState.HALF_DRY : PlotWaterState.DRY

    const totalDrainRate = plot.leftPlantDrainRate + plot.rightPlantDrainRate + plot.upPlantDrainRate + plot.downPlantDrainRate + plot.centerPlantDrainRate
    const waterRegenerationState = totalDrainRate === 90 ?
    PlotWaterRegenerationState.EQUALIBRIUM :
    totalDrainRate > 90 ?
        PlotWaterRegenerationState.REGENERATING :
        PlotWaterRegenerationState.DRAINING;

    // const plotWater = plot.water    

    if (rawPlants[i] && rawPlants[i].data) {
      const plant = rawPlants[i].data;

      let nextTendAvailableFrom = 0
      let tendEffectStartsFrom = 0
      if (plant.timesToTend !== 0) {
        const balancePerTend = plant.balanceRequired.div(new BN(plant.timesToTend).add(new BN(1)))

        const tendAllowedBeforeBuffer = balancePerTend.div(new BN(4)) // 25% earlier
        tendEffectStartsFrom = new BN(plant.timesTended).add(new BN(1)).mul(balancePerTend).toNumber()
        nextTendAvailableFrom = new BN(plant.timesTended).add(new BN(1)).mul(balancePerTend).sub(tendAllowedBeforeBuffer).toNumber()
      }

      // water calculations
      let updatedPlantWater = rawPlants[i].data.water;

      if (coords.y !== 0) {
        const lowerPlot = mapPlotCoords.y === 0 ? outerRawPlots[0 + mapPlotCoords.x] : rawPlots[(mapPlotCoords.y - 1) * 7 + mapPlotCoords.x]
        if (lowerPlot.data) {
          const data = lowerPlot.data
          const totalDrainRate = data.leftPlantDrainRate + data.rightPlantDrainRate + data.upPlantDrainRate + data.downPlantDrainRate + data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(data.water, 90, totalDrainRate, plant.neighborWaterDrainRate, currentBlock - (data.lastUpdateBlock.toNumber() || 0))[0]
        }
      }

      if (coords.y !== 999) {
        const upperPlot = mapPlotCoords.y === 6 ? outerRawPlots[1 + mapPlotCoords.x] : rawPlots[(mapPlotCoords.y + 1) * 7 + mapPlotCoords.x]
        if (upperPlot.data) {
          const data = upperPlot.data
          const totalDrainRate = data.leftPlantDrainRate + data.rightPlantDrainRate + data.upPlantDrainRate + data.downPlantDrainRate + data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(data.water, 90, totalDrainRate, plant.neighborWaterDrainRate, currentBlock - (data.lastUpdateBlock.toNumber() || 0))[0]
        }
      }

      if (coords.x !== 0) {
        const leftPlot = mapPlotCoords.x === 0 ? outerRawPlots[2 + mapPlotCoords.y] : rawPlots[mapPlotCoords.y * 7 + mapPlotCoords.x - 1]
        if (leftPlot.data) {
          const data = leftPlot.data
          const totalDrainRate = data.leftPlantDrainRate + data.rightPlantDrainRate + data.upPlantDrainRate + data.downPlantDrainRate + data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(data.water, 90, totalDrainRate, plant.neighborWaterDrainRate, currentBlock - (data.lastUpdateBlock.toNumber() || 0))[0]
        }
      }

      if (coords.x !== 999) {
        const rightPlot = mapPlotCoords.x === 6 ? outerRawPlots[3 + mapPlotCoords.y] : rawPlots[mapPlotCoords.y * 7 + mapPlotCoords.x + 1]
        if (rightPlot.data) {
          const data = rightPlot.data
          const totalDrainRate = data.leftPlantDrainRate + data.rightPlantDrainRate + data.upPlantDrainRate + data.downPlantDrainRate + data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(data.water, 90, totalDrainRate, plant.neighborWaterDrainRate, currentBlock - (data.lastUpdateBlock.toNumber() || 0))[0]
        }
      }
      // center plot is rawPlot[i] (plot)

      const updatedWaterStats = estimatePlantAndPlotWater(
        plot.water,
        90,
        totalDrainRate,
        100 - (plant.neighborWaterDrainRate * 4),
        currentBlock - (plot.lastUpdateBlock.toNumber() || 0),
      )
      let updatedPlotWater = updatedWaterStats[1];
      updatedPlantWater += updatedWaterStats[0]
      
      // TODO add up to date balance

      updatedMp[mapPlotCoords.x][mapPlotCoords.y] = {
        isOwner: plotOwnership.isOwner,
        isPlantOwner: plotOwnership.isPlantOwner,
        isFarmOwner: plotOwnership.isFarmOwner,
        isUnminted: plotOwnership.isUnminted,
  
       // plant
       plant: {
        nextTendFrom: nextTendAvailableFrom, // 0 or slot
        timesToTend: plant.timesToTend,
        timesTended: plant.timesTended,
        balanceAbsorbed: plant.balance,
        waterAbsorbed: plant.water,
        state: tendEffectStartsFrom < currentBlock ? PlantState.NEEDS_TENDING : PlantState.GROWING,
       },
          
       // plot states
       waterState,
       waterRegenerationState,
        
       balanceState: PlotBalanceState.CAN_BE_REVOKED,
  
       centerPlantDrainRate: plot.centerPlantDrainRate,
       centerPlantWaterCollected: plot.centerPlantWaterCollected,
       leftPlantDrainRate: plot.leftPlantDrainRate,
       leftPlantWaterCollected: plot.leftPlantWaterCollected,
       rightPlantDrainRate: plot.rightPlantDrainRate,
       rightPlantWaterCollected: plot.rightPlantWaterCollected,
       upPlantDrainRate: plot.upPlantDrainRate,
       upPlantWaterCollected: plot.upPlantWaterCollected,
       downPlantDrainRate: plot.downPlantDrainRate,
       downPlantWaterCollected: plot.downPlantWaterCollected,
  
       // stats
       lastStateUpdateBlock: plot.lastUpdateBlock.toNumber(),
       balance: plot.balance,
       waterLevel: updatedPlotWater,
       waterRegen: 90, // currently always 90
  
       // plot
       color: getPlotColor(plotOwnership.isFarmOwner, plotOwnership.isOwner, plotOwnership.isPlantOwner, plotOwnership.isUnminted),
       opacity: 1,
      }

      return updatedMp
    }

    const updatedWaterLevel = estimatePlantAndPlotWater(
      plot.water,
      90,
      totalDrainRate,
      0,
      currentBlock - (plot.lastUpdateBlock.toNumber() || 0),
    )[1]

    console.log('updatedWaterLevel', updatedWaterLevel)
    updatedMp[mapPlotCoords.x][mapPlotCoords.y] = {
      isOwner: plotOwnership.isOwner,
      isPlantOwner: plotOwnership.isPlantOwner,
      isFarmOwner: plotOwnership.isFarmOwner,
      isUnminted: plotOwnership.isUnminted,

     // plant
     plant: null,
        
     // plot states
     waterState,
     waterRegenerationState,
     balanceState: PlotBalanceState.CAN_BE_REVOKED,

     centerPlantDrainRate: plot.centerPlantDrainRate,
     centerPlantWaterCollected: plot.centerPlantWaterCollected,
     leftPlantDrainRate: plot.leftPlantDrainRate,
     leftPlantWaterCollected: plot.leftPlantWaterCollected,
     rightPlantDrainRate: plot.rightPlantDrainRate,
     rightPlantWaterCollected: plot.rightPlantWaterCollected,
     upPlantDrainRate: plot.upPlantDrainRate,
     upPlantWaterCollected: plot.upPlantWaterCollected,
     downPlantDrainRate: plot.downPlantDrainRate,
     downPlantWaterCollected: plot.downPlantWaterCollected,

     // stats
     lastStateUpdateBlock: 0,
     balance: plot.balance,
     waterLevel: updatedWaterLevel,
     waterRegen: 90, // currently always 90

     // plot
     color: getPlotColor(plotOwnership.isFarmOwner, plotOwnership.isOwner, plotOwnership.isPlantOwner, plotOwnership.isUnminted),
     opacity: 1,
    }

    return updatedMp
    // }

    // const isOwner = plot.owner.toLowerCase() === walletAddress
    // const isPlantOwner = plot?.plant?.owner?.toLowerCase() === walletAddress
    // const isUnminted = false

    // const seedType: string = Object.values(SEED_TYPE).filter(
    //   (t) => publicRuntimeConfig[`C_${t}_SEED`]?.toLowerCase() === plot.plant.seed.toLowerCase(),
    // )[0]

    // if (!seedType) {
    //   updatedMp[plotCoords.x][plotCoords.y] = {
    //     isOwner,
    //     isPlantOwner,
    //     isUnminted,

    //     // plant
    //     seedType: undefined,
    //     plantState: undefined,
    //     waterAbsorbed: undefined,
    //     plantedBlockNumber: undefined,
    //     overgrownBlockNumber: undefined,

    //     // plot
    //     color: getPlotColor(isOwner, isPlantOwner, isUnminted),
    //     lastStateChangeBlock: plot.waterLog?.blockNumber?.toNumber() || 0,
    //     waterLevel: currentPlotWaterLevel,
    //   }

    //   return updatedMp
    // }

    // const growthBlockDuration = getGrowthBlockDuration(seedType)

    // const neighborPlots = getNeighborPlots(
    //   plotCoords,
    //   contractPlots,
    //   surroundingWaterLogs,
    //   absoluteCornerX,
    //   absoluteCornerY,
    // )

    // const waterAbsorbed = estimatePlantWaterAbsorbed(
    //   plot?.plant?.waterAbsorbed?.toNumber() || 0,
    //   lastKnownPlotWaterLevel,
    //   lastKnownPlotWaterChange,
    //   centerPlotBlocksPassed,
    //   neighborPlots.map((np) => np.waterLog?.level?.toNumber() || parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10)),
    //   neighborPlots.map((np) => np.waterLog?.changeRate?.toNumber() || 0),
    //   neighborPlots.map((np) =>
    //     currentBlock - (np.waterLog?.blockNumber?.toNumber() || 0) < 0
    //       ? 0
    //       : currentBlock - (np.waterLog?.blockNumber?.toNumber() || 0),
    //   ),
    // )

    // const plantState = getPlantState(
    //   BigNumber.from(currentBlock),
    //   plot.plant.plantedBlockNumber,
    //   plot.plant.overgrownBlockNumber,
    //   BigNumber.from(growthBlockDuration),
    // )

    // updatedMp[plotCoords.x][plotCoords.y] = {
    //   isOwner,
    //   isPlantOwner,
    //   isUnminted,

    //   // plant
    //   seedType,
    //   plantState,
    //   waterAbsorbed,
    //   plantedBlockNumber: plot.plant.plantedBlockNumber.toNumber(),
    //   overgrownBlockNumber: plot.plant.overgrownBlockNumber.toNumber(),

    //   // plot
    //   color: getPlotColor(isOwner, isPlantOwner, isUnminted),
    //   lastStateChangeBlock: plot.waterLog?.blockNumber?.toNumber() || 0,
    //   waterLevel: currentPlotWaterLevel,
    // }

    // return updatedMp
  }, {})

export const getEmptyPlotInfo = () => ({
  isOwner: false,
  isPlantOwner: false,
  isFarmOwner: false,
  isUnminted: true,

  // plant
  seedType: undefined,
  plantState: undefined,
  waterAbsorbed: undefined,
  plantedBlockNumber: undefined,
  overgrownBlockNumber: undefined,

  lastStateChangeBlock: 0,
  waterLevel: parseInt(publicRuntimeConfig.PLOT_MAX_WATER, 10),

  // plot
  color: getDefaultPlotColor(),
  opacity: 0.5,
})

// eslint-disable-next-line import/prefer-default-export
export const generateEmptyMappedPlotInfos = (coords: Coordinates[]): MappedPlotInfos =>
  coords.reduce(
    (mpi: MappedPlotInfos, c: Coordinates) => ({
      ...mpi,
      [c.x]: {
        ...mpi[c.x],
        [c.y]: getEmptyPlotInfo(),
      },
    }),
    {},
  )
