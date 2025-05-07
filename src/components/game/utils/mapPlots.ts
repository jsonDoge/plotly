import getConfig from 'next/config'
// import { BigNumber } from 'ethers'
// import { getGrowthBlockDuration, getPlantState } from '../../../services/farm'
// import { SEED_TYPE } from '../../../utils/constants'
import { mapRawPlotOwnership } from '@/services/web3Utils'
import { PublicKey } from '@solana/web3.js'
import { PlantState, PlotBalanceState, PlotWaterRegenerationState, PlotWaterState } from '@/utils/enums'
import BN from 'bn.js'
import { Coordinates, MappedPlotInfos, PlotInfo, RawPlant, RawPlot } from './interfaces'
import { getDefaultPlotColor, getPlotColor } from './plotColors'

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
      return [plantWaterDrainRate * blocksPassed, Math.min(plotWater + plotWaterRegen * blocksPassed, plotMaxWater)]
    }

    const blocksAbove30Threashold = Math.ceil(plotWater - PLOT_30_THREASHOLD / Math.abs(plotWaterRegen))

    // plot losing water but stays above 30% water
    if (blocksAbove30Threashold > blocksPassed) {
      return [plantWaterDrainRate * blocksPassed, plotWater - Math.abs(plotWaterRegen) * blocksPassed]
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

    return [plantWaterDrainRate * blocksAbove30Threashold + waterFromLowerLevel[0], waterFromLowerLevel[1]]
  }

  // base regen at 70% (water level below 30%)
  if (plotWater > PLOT_10_THREASHOLD && plotWater <= PLOT_30_THREASHOLD) {
    const plotWaterRegen = Math.floor(plotBaseWaterRegen * 0.7) - plotTotalWaterDrainRate

    // plot is unchanging water
    if (plotWaterRegen == 0) {
      return [plantWaterDrainRate * blocksPassed, plotWater]
    }

    // plot is gaining water
    if (plotWaterRegen > 0) {
      const blocksUntil30Threashold = Math.ceil((PLOT_30_THREASHOLD + 1 - plotWater) / plotWaterRegen)

      if (blocksUntil30Threashold > blocksPassed) {
        return [plantWaterDrainRate * blocksPassed, plotWater + plotWaterRegen * blocksPassed]
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

      return [plantWaterDrainRate * blocksUntil30Threashold + waterFromHigherLevel[0], waterFromHigherLevel[1]]
    }

    // plot is losing water

    const blocksAbove10Threashold = Math.ceil((plotWater - PLOT_10_THREASHOLD) / Math.abs(plotWaterRegen))

    // plot losing water but stays above 10% water
    if (blocksAbove10Threashold > blocksPassed) {
      return [plantWaterDrainRate * blocksPassed, plotWater - Math.abs(plotWaterRegen) * blocksPassed]
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

    return [plantWaterDrainRate * blocksAbove10Threashold + waterFromLowerLevel[0], waterFromLowerLevel[1]]
  }

  // base regen at 50% (water level below 10%)
  if (plotWater <= PLOT_10_THREASHOLD) {
    const newBaseWaterRegen = Math.floor(plotBaseWaterRegen * 0.5)
    const plotWaterRegen = newBaseWaterRegen - plotTotalWaterDrainRate

    // equalibrium
    if (plotWaterRegen == 0) {
      return [plantWaterDrainRate * blocksPassed, plotWater]
    }

    if (plotWaterRegen > 0) {
      // plot is gaining water
      const blocksUntil10Threashold = Math.ceil((PLOT_10_THREASHOLD + 1 - plotWater) / plotWaterRegen)

      // water is gaining but stays below 10% water
      if (blocksUntil10Threashold > blocksPassed) {
        return [plantWaterDrainRate * blocksPassed, plotWater + plotWaterRegen * blocksPassed]
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

      return [plantWaterDrainRate * blocksUntil10Threashold + waterFromHigherLevel[0], waterFromHigherLevel[1]]
    }

    // water is negative and can reach bone dry

    const fullBlocksLeft = Math.floor(plotWater / Math.abs(plotWaterRegen))

    if (fullBlocksLeft >= blocksPassed) {
      return [plantWaterDrainRate * blocksPassed, plotWater - Math.abs(plotWaterRegen) * blocksPassed]
    }

    const waterRegeneratedAfterFullBlocks =
      plotWater - fullBlocksLeft * Math.abs(plotWaterRegen) + (blocksPassed - fullBlocksLeft) * newBaseWaterRegen
    const blocksWorthOfWaterAbsorbed = Math.floor(waterRegeneratedAfterFullBlocks / plantWaterDrainRate)

    const waterLeft = waterRegeneratedAfterFullBlocks - blocksWorthOfWaterAbsorbed * plantWaterDrainRate

    return [
      (blocksWorthOfWaterAbsorbed + fullBlocksLeft) * plantWaterDrainRate,
      plotWater - fullBlocksLeft * Math.abs(plotWaterRegen) + waterLeft,
    ]
  }

  throw new Error(`Invalid plot water level ${plotWater})`)
}

// returns [absorbed, newPlotBalance, blocksAbsorbed]
const estimatePlotBalance = (
  plantBalance: BN,
  plotBalance: BN,
  plantAbsorbRate: BN,
  balancePerTend: BN,
  timesTended: number,
  maxTends: number,
  balanceTillFull: BN,
  blocksPassed: BN,
): [BN, BN, BN] => {
  const ZERO = new BN(0)

  if (plotBalance.eq(ZERO) || blocksPassed.eq(ZERO) || balanceTillFull.eq(ZERO)) {
    return [ZERO, plotBalance, ZERO]
  }

  if (timesTended === maxTends) {
    const maxAvailable = BN.min(balanceTillFull, plotBalance)
    const absorbed = BN.min(plantAbsorbRate.mul(blocksPassed), maxAvailable)
    const absorbedBlocks = absorbed.add(plantAbsorbRate).subn(1).div(plantAbsorbRate)
    return [absorbed, plotBalance.sub(absorbed), absorbedBlocks]
  }

  const nextTendBalance = balancePerTend.muln(timesTended + 1)
  const isInOverage = plantBalance.gte(nextTendBalance)

  if (isInOverage) {
    return getBalanceCollectedAtOverage(
      plantBalance,
      plotBalance,
      plantAbsorbRate,
      balancePerTend,
      blocksPassed,
      balanceTillFull,
    )
  }

  const balanceTillOverage = nextTendBalance.sub(plantBalance)
  const blocksUntilOverage = BN.max(balanceTillOverage.add(plantAbsorbRate).subn(1).div(plantAbsorbRate), new BN(1))

  if (blocksUntilOverage.gte(blocksPassed)) {
    const maxAvailable = BN.min(balanceTillFull, plotBalance)
    const absorbed = BN.min(plantAbsorbRate.mul(blocksPassed), maxAvailable)
    const absorbedBlocks = absorbed.add(plantAbsorbRate).subn(1).div(plantAbsorbRate)
    return [absorbed, plotBalance.sub(absorbed), absorbedBlocks]
  }

  const maxAvailable = BN.min(balanceTillFull, plotBalance)
  const absorbed = BN.min(plantAbsorbRate.mul(blocksUntilOverage), maxAvailable)

  if (absorbed.gte(plotBalance)) {
    const absorbedBlocks = absorbed.add(plantAbsorbRate).subn(1).div(plantAbsorbRate)
    return [plotBalance, ZERO, absorbedBlocks]
  }

  const newPlotBalance = plotBalance.sub(absorbed)
  const newPlantBalance = plantBalance.add(absorbed)
  const remainingBlocks = blocksPassed.sub(blocksUntilOverage)
  const newBalanceTillFull = balanceTillFull.sub(absorbed)

  const [extraAbsorbed, finalPlotBalance, extraBlocks] = getBalanceCollectedAtOverage(
    newPlantBalance,
    newPlotBalance,
    plantAbsorbRate,
    balancePerTend,
    remainingBlocks,
    newBalanceTillFull,
  )

  return [absorbed.add(extraAbsorbed), finalPlotBalance, blocksUntilOverage.add(extraBlocks)]
}

export const getBalanceCollectedAtOverage = (
  plantBalance: BN,
  plotBalance: BN,
  plantAbsorbRate: BN,
  balancePerTend: BN,
  blocksInOverage: BN,
  balanceTillFull: BN,
): [BN, BN, BN] => {
  const ZERO = new BN(0)

  if (balanceTillFull.eq(ZERO)) {
    return [ZERO, plotBalance, ZERO]
  }

  const overage = plantBalance.mod(balancePerTend)
  const overageStep = balancePerTend.divn(4)

  if (overage.gte(overageStep)) {
    return [ZERO, plotBalance, ZERO]
  }

  const overageAbsorbRate = plantAbsorbRate.divn(2)
  const blocksUntilStop = overageStep.sub(overage).add(overageAbsorbRate).subn(1).div(overageAbsorbRate)
  const maxAvailable = BN.min(balanceTillFull, plotBalance)
  const absorbCap = overageStep.sub(overage)

  if (blocksUntilStop.lte(blocksInOverage)) {
    const absorbed = BN.min(absorbCap, maxAvailable)
    const absorbedBlocks = absorbed.add(overageAbsorbRate).subn(1).div(overageAbsorbRate)
    return [absorbed, plotBalance.sub(absorbed), absorbedBlocks]
  }

  const absorbed = BN.min(overageAbsorbRate.mul(blocksInOverage), maxAvailable)
  const absorbedBlocks = absorbed.add(overageAbsorbRate).subn(1).div(overageAbsorbRate)
  return [absorbed, plotBalance.sub(absorbed), absorbedBlocks]
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

    // if (rawPlot.data && rawPlot.data?.centerPlantDrainRate !== 0) {
    //   console.log('center non zero rawPlot', rawPlot)
    // }
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
    const plot = rawPlot.data

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
        color: getPlotColor(
          plotOwnership.isFarmOwner,
          plotOwnership.isOwner,
          plotOwnership.isPlantOwner,
          plotOwnership.isUnminted,
        ),
        opacity: 0.5,
      }

      return updatedMp
    }

    const plotWater30Threashold = parseInt(publicRuntimeConfig.PLOT_WATER_30_THRESHOLD, 10)
    const plotWater10Threashold = parseInt(publicRuntimeConfig.PLOT_WATER_10_THRESHOLD, 10)

    const waterState =
      plot.water > plotWater30Threashold
        ? PlotWaterState.GOOD
        : plot.water > plotWater10Threashold
          ? PlotWaterState.HALF_DRY
          : PlotWaterState.DRY

    const totalDrainRate =
      plot.leftPlantDrainRate +
      plot.rightPlantDrainRate +
      plot.upPlantDrainRate +
      plot.downPlantDrainRate +
      plot.centerPlantDrainRate

    const waterRegenerationState =
      totalDrainRate === 90
        ? PlotWaterRegenerationState.EQUALIBRIUM
        : totalDrainRate > 90
          ? PlotWaterRegenerationState.REGENERATING
          : PlotWaterRegenerationState.DRAINING

    // const plotWater = plot.water

    if (rawPlants[i]?.data && rawPlants[i]?.data?.seedMint.toString() !== PublicKey.default.toString()) {
      const plant = rawPlants[i].data

      // Next tend is from the slot you are allowed to tend (Not when balance absorb rate drops)
      let nextTendAvailableFrom = 0
      let tendEffectStartsFrom = 0
      if (plant.timesTended !== plant.timesToTend) {
        const balancePerTend = plant.balanceRequired.div(new BN(plant.timesToTend).add(new BN(1)))

        const tendAllowedBeforeBuffer = balancePerTend.div(new BN(4)) // 25% earlier
        tendEffectStartsFrom = new BN(plant.timesTended).add(new BN(1)).mul(balancePerTend).toNumber()
        nextTendAvailableFrom = new BN(plant.timesTended)
          .add(new BN(1))
          .mul(balancePerTend)
          .sub(tendAllowedBeforeBuffer)
          .add(plot.lastUpdateBlock)
          .toNumber()
      }

      // water calculations
      let updatedPlantWater = rawPlants[i].data.water

      if (coords.y !== 0) {
        const lowerPlot =
          mapPlotCoords.y === 0
            ? outerRawPlots[0 + mapPlotCoords.x]
            : rawPlots[(mapPlotCoords.y - 1) * 7 + mapPlotCoords.x]
        if (lowerPlot.data) {
          const { data } = lowerPlot
          const neighborTotalDrainRate =
            data.leftPlantDrainRate +
            data.rightPlantDrainRate +
            data.upPlantDrainRate +
            data.downPlantDrainRate +
            data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(
            data.water,
            90,
            neighborTotalDrainRate,
            plant.neighborWaterDrainRate,
            currentBlock - (data.lastUpdateBlock.toNumber() || 0),
          )[0]
          updatedPlantWater += lowerPlot.data.upPlantWaterCollected
        }
      }

      if (coords.y !== 999) {
        const upperPlot =
          mapPlotCoords.y === 6
            ? outerRawPlots[1 + mapPlotCoords.x]
            : rawPlots[(mapPlotCoords.y + 1) * 7 + mapPlotCoords.x]
        if (upperPlot.data) {
          const { data } = upperPlot
          const neighborTotalDrainRate =
            data.leftPlantDrainRate +
            data.rightPlantDrainRate +
            data.upPlantDrainRate +
            data.downPlantDrainRate +
            data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(
            data.water,
            90,
            neighborTotalDrainRate,
            plant.neighborWaterDrainRate,
            currentBlock - (data.lastUpdateBlock.toNumber() || 0),
          )[0]
          updatedPlantWater += upperPlot.data.downPlantWaterCollected
        }
      }

      if (coords.x !== 0) {
        const leftPlot =
          mapPlotCoords.x === 0
            ? outerRawPlots[2 + mapPlotCoords.y]
            : rawPlots[mapPlotCoords.y * 7 + mapPlotCoords.x - 1]
        if (leftPlot.data) {
          const { data } = leftPlot
          const neighborTotalDrainRate =
            data.leftPlantDrainRate +
            data.rightPlantDrainRate +
            data.upPlantDrainRate +
            data.downPlantDrainRate +
            data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(
            data.water,
            90,
            neighborTotalDrainRate,
            plant.neighborWaterDrainRate,
            currentBlock - (data.lastUpdateBlock.toNumber() || 0),
          )[0]
          updatedPlantWater += leftPlot.data.rightPlantWaterCollected
        }
      }

      if (coords.x !== 999) {
        const rightPlot =
          mapPlotCoords.x === 6
            ? outerRawPlots[3 + mapPlotCoords.y]
            : rawPlots[mapPlotCoords.y * 7 + mapPlotCoords.x + 1]
        if (rightPlot.data) {
          const { data } = rightPlot
          const neighborTotalDrainRate =
            data.leftPlantDrainRate +
            data.rightPlantDrainRate +
            data.upPlantDrainRate +
            data.downPlantDrainRate +
            data.centerPlantDrainRate
          updatedPlantWater += estimatePlantAndPlotWater(
            data.water,
            90,
            neighborTotalDrainRate,
            plant.neighborWaterDrainRate,
            currentBlock - (data.lastUpdateBlock.toNumber() || 0),
          )[0]
          updatedPlantWater += rightPlot.data.leftPlantWaterCollected
        }
      }
      // center plot is rawPlot[i] (plot)

      const updatedWaterStats = estimatePlantAndPlotWater(
        plot.water,
        90,
        totalDrainRate,
        100 - plant.neighborWaterDrainRate * 4,
        new BN(currentBlock).sub(plot.lastUpdateBlock).toNumber(),
      )
      const updatedPlotWater = updatedWaterStats[1]
      updatedPlantWater += updatedWaterStats[0] + plot.centerPlantWaterCollected

      // estimate plant/plot balance
      const balancePerTend = plant.balanceRequired.div(new BN(plant.timesToTend).add(new BN(1)))
      const blocksPassed = new BN(currentBlock).sub(plot.lastUpdateBlock)
      const balanceUpdate = estimatePlotBalance(
        plant.balance,
        plot.balance,
        plant.balanceAbsorbRate,
        balancePerTend,
        plant.timesTended,
        plant.timesToTend,
        plant.balanceRequired.sub(plant.balance),
        blocksPassed,
      )

      const plantBalance = plant.balance.add(balanceUpdate[0])
      let plotBalance = balanceUpdate[1]

      const blocksAbsorbed = balanceUpdate[2]
      // apply rent if applies
      if (blocksAbsorbed.lt(blocksPassed) && plotBalance.lt(new BN(publicRuntimeConfig.PLOT_FREE_RENT_LIMIT))) {
        const rentDrain = blocksPassed.sub(blocksAbsorbed)
        const balanceDrained = plotBalance.gt(rentDrain) ? rentDrain : plotBalance
        plotBalance = plotBalance.sub(balanceDrained)
      }

      let totalMissingNeighbors = 0
      if (coords.x === 0) {
        totalMissingNeighbors += 1
      }
      if (coords.x === 999) {
        totalMissingNeighbors += 1
      }
      if (coords.y === 0) {
        totalMissingNeighbors += 1
      }
      if (coords.y === 999) {
        totalMissingNeighbors += 1
      }

      // because at the sides of map there simply is no neighbor
      const actualWaterAbsorbRate = 100 - plant.neighborWaterDrainRate * totalMissingNeighbors

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
          balanceAbsorbed: plantBalance,
          waterAbsorbed: updatedPlantWater,
          state:
            nextTendAvailableFrom !== 0 && nextTendAvailableFrom < currentBlock
              ? PlantState.NEEDS_TENDING
              : PlantState.GROWING,
          balanceRequired: plant.balanceRequired,
          balanceAbsorbRate: plant.balanceAbsorbRate,
          waterRequired: plant.waterRequired,
          actualWaterAbsorbRate,
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
        balance: plotBalance,
        waterLevel: updatedPlotWater,
        waterRegen: 90, // currently always 90

        // plot
        color: getPlotColor(
          plotOwnership.isFarmOwner,
          plotOwnership.isOwner,
          plotOwnership.isPlantOwner,
          plotOwnership.isUnminted,
        ),
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

    // estimate plant/plot balance
    const blocksPassed = new BN(currentBlock - (plot.lastUpdateBlock.toNumber() || 0))

    let plotBalance = plot.balance
    // apply rent if applies
    if (plotBalance.lt(new BN(publicRuntimeConfig.PLOT_FREE_RENT_LIMIT))) {
      const rentDrain = blocksPassed
      const balanceDrained = plotBalance.gt(rentDrain) ? rentDrain : plotBalance
      plotBalance = plotBalance.sub(balanceDrained)
    }

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
      balanceState: plotBalance.lt(new BN(publicRuntimeConfig.PLOT_FREE_RENT_LIMIT))
        ? PlotBalanceState.BELOW_FREE_RENT
        : plotBalance.lt(new BN(publicRuntimeConfig.PLOT_MINIMUM_BALANCE).divn(10))
          ? PlotBalanceState.CAN_BE_REVOKED
          : PlotBalanceState.ABOVE_FREE_RENT,

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
      balance: plotBalance,
      waterLevel: updatedWaterLevel,
      waterRegen: 90, // currently always 90

      // plot
      color: getPlotColor(
        plotOwnership.isFarmOwner,
        plotOwnership.isOwner,
        plotOwnership.isPlantOwner,
        plotOwnership.isUnminted,
      ),
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

export const getEmptyPlotInfo = (): PlotInfo => ({
  isOwner: false,
  isPlantOwner: false,
  isFarmOwner: false,
  isUnminted: false,

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
