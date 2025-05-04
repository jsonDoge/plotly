import { BufferGeometry, Mesh, MeshStandardMaterial, Vector3Tuple } from 'three'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { PlantState, PlotBalanceState, PlotWaterRegenerationState, PlotWaterState } from '../../../utils/enums'

export interface GetAreNumbersEqualRoot {
  (equalTo: number): GetAreNumbersEqual
}

export interface BackgroundModelParams {
  position: Vector3Tuple
  rotation: Vector3Tuple
  isVisible: boolean
  isSemiTransparent: boolean
}

export interface RawPlot {
  data: {
    balance: BN
    lastClaimer: PublicKey
    water: number

    // plant drain and water collected
    centerPlantDrainRate: number
    centerPlantWaterCollected: number
    leftPlantDrainRate: number
    leftPlantWaterCollected: number
    rightPlantDrainRate: number
    rightPlantWaterCollected: number
    upPlantDrainRate: number
    upPlantWaterCollected: number
    downPlantDrainRate: number
    downPlantWaterCollected: number

    waterRegen: number
    lastUpdateBlock: BN
  } | null
}

export interface RawPlant {
  data: {
    balance: BN
    balanceAbsorbRate: BN,
    balanceRequired: BN,
    lastUpdateBlock: BN, // should be ignored as all resources are updated in plot
    neighborWaterDrainRate: number
    seedMint: PublicKey
    timesTended: number
    timesToTend: number
    treasury: PublicKey
    treasuryReceivedBalance: BN
    water: number
    waterRequired: number
  } | null
}

export interface MappedPlotInfos {
  [x: number]: {
    [y: number]: PlotInfo
  }
}

export interface PlotInfo {
  isOwner: boolean
  isPlantOwner: boolean
  isFarmOwner: boolean
  isUnminted: boolean

  // plant
  plant: {
    nextTendFrom: number // slot
    timesToTend: number
    timesTended: number
    balanceAbsorbed: BN
    waterAbsorbed: number
    state: PlantState
    balanceRequired: BN
    balanceAbsorbRate: BN
    waterRequired: number
    actualWaterAbsorbRate: number
  } | null

  waterState: PlotWaterState
  balanceState: PlotBalanceState
  waterRegenerationState: PlotWaterRegenerationState

  // plant drain and water collected
  centerPlantDrainRate: number
  centerPlantWaterCollected: number
  leftPlantDrainRate: number
  leftPlantWaterCollected: number
  rightPlantDrainRate: number
  rightPlantWaterCollected: number
  upPlantDrainRate: number
  upPlantWaterCollected: number
  downPlantDrainRate: number
  downPlantWaterCollected: number

  // plot stats
  lastStateUpdateBlock: number | undefined
  balance: BN
  waterLevel: number
  waterRegen: number // currently always 90

  // design
  color: PlotColor
  opacity: number // 0.0 - 1.0
}

export interface PlotColor {
  rgb: { r: number; g: number; b: number }
  rgbHover: { r: number; g: number; b: number }
  hex: string
}

export interface GetAreNumbersEqual {
  (n: number): boolean
}
export interface GLTFResult extends GLTF {
  nodes: {
    /* replace with your nodes names */
    Head: THREE.Mesh
    Cube: THREE.Mesh
  }
  materials: {
    Material: THREE.MeshStandardMaterial
  }
}
export interface Coordinates {
  x: number
  y: number
}

export interface PlotMesh extends THREE.Mesh {
  isAscending: boolean
  isDescending: boolean
  isAscended: boolean
  isDescended: boolean
  material: MeshStandardMaterial
}

export interface ModelMesh extends Mesh<BufferGeometry, MeshStandardMaterial> {}
