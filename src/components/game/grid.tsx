/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-param-reassign */
import React, { useRef, useEffect, createRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { DirectionalLight, Mesh, OrthographicCamera } from 'three';

// Models
import Tree from './modelElements/tree';
import Fir from './modelElements/fir';
import Grass from './modelElements/grass';
import Plot from './modelElements/plot';

// Utils
import { generateRefGrid, normalizePlotArea, normalizePlotDimension } from './utils';
import {
  getBackgroundModelParams,
  getAreNumbersEqualRoot,
  getInvisibleArea,
  getSemiTransparentArea,
  updateBackgroundModelsToParams,
} from './utils/background';
import { BackgroundModelParams, Coordinates, ModelMesh, PlotMesh } from './utils/interfaces';
import {
  ascendDescendPlots,
  fillGridPositions,
  fillSurroundRowPositions,
  resetAscendedDescendedPlotParams,
  updateSurroundPlotAscention,
  updatePlotPositionAfterAscention,
} from './utils/plots';
import {
  BACKGROUND_PLANT_OFFSET_X,
  BACKGROUND_PLANT_OFFSET_Y,
  DIRECTIONAL_LIGHT_OFFSET_X,
  DIRECTIONAL_LIGHT_OFFSET_Y,
  DIRECTIONAL_LIGHT_OFFSET_Z,
  PLOT_GRID_SIZE,
  PLOT_SIZE,
} from './utils/constants';
import { Probability } from './utils/enums';

import MainPlots from './mainPlots';

interface IGrid {
  plotCenterRef: React.MutableRefObject<{ x: number; y: number }>;
}

const Grid: React.FC<IGrid> = ({ plotCenterRef }) => {
  console.info('Rendering grid');

  let lastPlotCenter: Coordinates | undefined;
  const { scene } = useThree();

  const planeRef = useRef<Mesh>(null);
  const lightRef = useRef<DirectionalLight>(null);
  const orthCameraRef = useRef<OrthographicCamera>(null);

  const backgroundTreeRefs = new Array(100).fill(undefined).map(() => createRef<ModelMesh>());
  const backgroundFirRefs = new Array(100).fill(undefined).map(() => createRef<ModelMesh>());
  const backgroundGrassRefs = new Array(400).fill(undefined).map(() => createRef<ModelMesh>());

  const backgroundTreeParamsRef = useRef<Array<BackgroundModelParams>>([]);
  const backgroundFirParamsRef = useRef<Array<BackgroundModelParams>>([]);
  const backgroundGrassParamsRef = useRef<Array<BackgroundModelParams>>([]);

  const mainPlotRefs = useRef(generateRefGrid<PlotMesh>(PLOT_GRID_SIZE, PLOT_GRID_SIZE));
  const surroundPlotRefs = useRef(generateRefGrid<PlotMesh>(PLOT_GRID_SIZE, 4));

  const directionalLightInitialPosition = {
    x: DIRECTIONAL_LIGHT_OFFSET_X + plotCenterRef.current.x * PLOT_SIZE,
    y: DIRECTIONAL_LIGHT_OFFSET_Y + plotCenterRef.current.y * PLOT_SIZE,
    z: DIRECTIONAL_LIGHT_OFFSET_Z,
  };

  const getIsNumberEqualTo1 = getAreNumbersEqualRoot(1);
  const getIsNumberEqualTo2 = getAreNumbersEqualRoot(2);
  const getIsNumberEqualTo3 = getAreNumbersEqualRoot(3);

  const generateBackgroundModelParams = (plotCenter: Coordinates) => {
    const invisibleArea = getInvisibleArea(plotCenter);
    const semiTransparentArea = getSemiTransparentArea(plotCenter);

    backgroundTreeParamsRef.current = getBackgroundModelParams(
      normalizePlotDimension(plotCenter.x + BACKGROUND_PLANT_OFFSET_X),
      normalizePlotDimension(plotCenter.y + BACKGROUND_PLANT_OFFSET_Y),
      PLOT_SIZE,
      normalizePlotDimension(30),
      normalizePlotArea(invisibleArea),
      normalizePlotArea(semiTransparentArea),
      getIsNumberEqualTo1,
      Probability.low,
    );

    backgroundFirParamsRef.current = getBackgroundModelParams(
      normalizePlotDimension(plotCenter.x + BACKGROUND_PLANT_OFFSET_X),
      normalizePlotDimension(plotCenter.y + BACKGROUND_PLANT_OFFSET_Y),
      PLOT_SIZE,
      normalizePlotDimension(30),
      normalizePlotArea(invisibleArea),
      normalizePlotArea(semiTransparentArea),
      getIsNumberEqualTo2,
      Probability.low,
    );

    const step = 1;
    backgroundGrassParamsRef.current = getBackgroundModelParams(
      Math.floor(normalizePlotDimension(plotCenter.x + BACKGROUND_PLANT_OFFSET_X)),
      Math.floor(normalizePlotDimension(plotCenter.y + BACKGROUND_PLANT_OFFSET_Y)),
      step,
      normalizePlotDimension(30),
      normalizePlotArea(invisibleArea),
      normalizePlotArea(semiTransparentArea),
      getIsNumberEqualTo3,
      Probability.high,
    );
  };

  const updateBackgroundModels = () => {
    if (backgroundTreeRefs.length !== 0) {
      updateBackgroundModelsToParams(backgroundTreeRefs, backgroundTreeParamsRef.current);
    }

    if (backgroundFirRefs.length !== 0) {
      updateBackgroundModelsToParams(backgroundFirRefs, backgroundFirParamsRef.current);
    }

    if (backgroundGrassRefs.length !== 0) {
      updateBackgroundModelsToParams(backgroundGrassRefs, backgroundGrassParamsRef.current);
    }
  };

  const updateLightPosition = () => {
    if (!lightRef?.current) {
      return;
    }

    lightRef.current.position.x = plotCenterRef.current.x * PLOT_SIZE + DIRECTIONAL_LIGHT_OFFSET_X;
    lightRef.current.position.y = plotCenterRef.current.y * PLOT_SIZE + DIRECTIONAL_LIGHT_OFFSET_Y;
    lightRef.current.target.position.x = (plotCenterRef.current.x - PLOT_GRID_SIZE) * PLOT_SIZE;
    lightRef.current.target.position.y = (plotCenterRef.current.y - PLOT_GRID_SIZE) * PLOT_SIZE;
  };

  // USE EFFECTS

  useEffect(() => {
    // orthCamera to set shadow limits (to not be cut off)

    // orthCamera for shadowing
    if (orthCameraRef?.current) {
      orthCameraRef.current.left = -20;
      orthCameraRef.current.right = 20;
      orthCameraRef.current.top = 40;
      orthCameraRef.current.bottom = -20;
      orthCameraRef.current.near = 0.5;
      orthCameraRef.current.far = 2000;
    }

    // add target for manipulation
    if (lightRef?.current && orthCameraRef?.current) {
      scene.add(lightRef.current.target);

      lightRef.current.shadow.camera = orthCameraRef.current;
    }
  }, []);

  // USE FRAMES

  // ascention/descention
  useFrame(() => {
    ascendDescendPlots(mainPlotRefs.current);
    ascendDescendPlots(surroundPlotRefs.current);
  });

  // move plots after rise/lower animation finished
  useFrame(() => {
    resetAscendedDescendedPlotParams(surroundPlotRefs.current);

    // HANDLING ascended movement
    updatePlotPositionAfterAscention(mainPlotRefs.current, surroundPlotRefs.current);
  });

  useFrame(() => {
    if (plotCenterRef.current.x !== lastPlotCenter?.x || plotCenterRef.current.y !== lastPlotCenter?.y) {
      const diffX = plotCenterRef.current.x - (lastPlotCenter?.x || 0);
      const diffY = plotCenterRef.current.y - (lastPlotCenter?.y || 0);

      if (lastPlotCenter && diffX === 0 && diffY === 0) {
        return;
      }

      if (lastPlotCenter && Math.abs(diffX) <= 1 && Math.abs(diffY) <= 1) {
        lastPlotCenter = { ...plotCenterRef.current };

        updateSurroundPlotAscention(diffX, diffY, surroundPlotRefs.current);
      } else {
        lastPlotCenter = { ...plotCenterRef.current };
        fillGridPositions(mainPlotRefs.current, PLOT_GRID_SIZE, plotCenterRef.current.x, plotCenterRef.current.y);
        fillSurroundRowPositions(
          surroundPlotRefs.current,
          PLOT_GRID_SIZE + 2,
          plotCenterRef.current.x,
          plotCenterRef.current.y,
        );
      }

      generateBackgroundModelParams(plotCenterRef.current);
      updateBackgroundModels();
    }

    updateLightPosition();
  });

  return (
    <>
      <ambientLight intensity={0.05} />
      <directionalLight
        ref={lightRef}
        intensity={2.2}
        color="#FDF3c6"
        castShadow
        position={[
          directionalLightInitialPosition.x,
          directionalLightInitialPosition.y,
          directionalLightInitialPosition.z,
        ]}
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
        shadow-radius={2}
      />
      <orthographicCamera ref={orthCameraRef} />
      <MainPlots mainPlotRefs={mainPlotRefs.current} plotCenterRef={plotCenterRef} />
      {surroundPlotRefs.current.map((r, ri) => r.map((c, ci) => <Plot key={`${ri}${ci}`} ref={c} />))}
      {backgroundTreeRefs.map((ref, i) => (
        <Tree key={i} ref={ref} />
      ))}
      {backgroundFirRefs.map((ref, i) => (
        <Fir key={i} ref={ref} />
      ))}
      {backgroundGrassRefs.map((ref, i) => (
        <Grass key={i} ref={ref} />
      ))}
      <mesh ref={planeRef} rotation={[0, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10000, 10000]} />
        <meshStandardMaterial color="#DCAB80" />
      </mesh>
      <gridHelper
        rotation={[90 * (Math.PI / 180), 0, 0]}
        position={[1.1, 1.1, 0]}
        args={[4200, 2000, '#382A21', '#382A21']}
      />
    </>
  );
};

export default Grid;
