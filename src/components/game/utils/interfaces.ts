import { BufferGeometry, Mesh, MeshStandardMaterial, Vector3Tuple } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { PlantState } from '../../../utils/enums';

export interface GetAreNumbersEqualRoot {
  (equalTo: number): GetAreNumbersEqual;
}

export interface BackgroundModelParams {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  isVisible: boolean;
  isSemiTransparent: boolean;
}

export interface MappedPlotInfos {
  [x: number]: {
    [y: number]: PlotInfo;
  };
}

export interface PlotInfo {
  isOwner: boolean;
  isPlantOwner: boolean;
  isUnminted: boolean;
  seedType: string | undefined;

  // plant
  plantState: PlantState | undefined;
  plantedBlockNumber: number | undefined;
  overgrownBlockNumber: number | undefined;
  waterAbsorbed: number | undefined;

  // plot
  color: PlotColor;
  lastStateChangeBlock: number | undefined;
  waterLevel: number;
}

export interface PlotColor {
  rgb: { r: number; g: number; b: number };
  rgbHover: { r: number; g: number; b: number };
  hex: string;
}

export interface GetAreNumbersEqual {
  (n: number): boolean;
}
export interface GLTFResult extends GLTF {
  nodes: {
    /* replace with your nodes names */
    Head: THREE.Mesh;
    Cube: THREE.Mesh;
  };
  materials: {
    Material: THREE.MeshStandardMaterial;
  };
}
export interface Coordinates {
  x: number;
  y: number;
}

export interface PlotMesh extends THREE.Mesh {
  isAscending: boolean;
  isDescending: boolean;
  isAscended: boolean;
  isDescended: boolean;
  material: MeshStandardMaterial;
}

export interface ModelMesh extends Mesh<BufferGeometry, MeshStandardMaterial> {}
