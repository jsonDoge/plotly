import getConfig from 'next/config'

import { PublicKey } from '@solana/web3.js'

const { publicRuntimeConfig } = getConfig()

export const getDishAddress = (type: string): string => {
  const dishAddress: string = publicRuntimeConfig[`C_${type}_DISH`] || ''
  if (dishAddress.length === 0) {
    throw new Error(`invalid plant type ${type}`)
  }
  return dishAddress
}

export const getProductAddress = (type: string): string => {
  const productAddress: string = publicRuntimeConfig[`C_${type}_PRODUCT`] || ''
  if (productAddress.length === 0) {
    throw new Error(`invalid plant type ${type}`)
  }
  return productAddress
}

export const getSeedAddress = (type: string): string => {
  const seedAddress: string = publicRuntimeConfig[`C_${type}_SEED`] || ''
  if (seedAddress.length === 0) {
    throw new Error(`invalid plant type ${type}`)
  }
  return seedAddress
}

export const getPlotIdFromCoordinates = (x: number, y: number) => x + y * 1000
export const getCoordinatesFromPlotId = (plotId: number): { x: number; y: number } => ({
  x: plotId % 1000,
  y: Math.floor(plotId / 1000),
})

export const isValidPublicKey = (str: string): boolean => {
  try {
    const _ = new PublicKey(str)
  } catch {
    return false
  }
  return true
}
