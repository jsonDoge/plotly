/* eslint-disable react/prop-types */
import * as THREE from 'three';
import React, { RefObject, useEffect, useRef, Fragment, memo, MutableRefObject } from 'react';

// components
import Plot from './modelElements/plot';
import Plant from './modelElements/plant';
import WeedGroup from './groupedElements/weedGroup';

// context
import { mappedPlotInfosStore, selectPlotStore } from '../../stores';

// interfaces
import { MappedPlotInfos, PlotMesh } from './utils/interfaces';

// utils
import { getDefaultPlotColor } from './utils/plotColors';
import { generateRefGrid } from './utils';

// constants
import { PLOT_GRID_SIZE } from './utils/constants';
import { SEED_TYPE } from '../../utils/constants';
import CornGroup from './groupedElements/cornGroup';
import PotatoGroup from './groupedElements/potatoGroup';
import CarrotGroup from './groupedElements/carrotGroup';
import { PlantState } from '../../utils/enums';

interface Props {
  mainPlotRefs: Array<Array<RefObject<PlotMesh>>>;
  plotCenterRef: MutableRefObject<{ x: number; y: number }>;
}

// React.memo to prevent re-render on screen resize as useEffects is not called
const MainPlots = memo<Props>(({ mainPlotRefs, plotCenterRef }) => {
  console.info('Rerendering mainPlots');

  const mappedPlotInfos = useRef<MappedPlotInfos>();
  const plantRefs = useRef<Array<Array<RefObject<THREE.Mesh>>>>(
    generateRefGrid<THREE.Mesh>(PLOT_GRID_SIZE, PLOT_GRID_SIZE),
  );
  const weedRefs = useRef<Array<Array<RefObject<THREE.Group>>>>(
    generateRefGrid<THREE.Group>(PLOT_GRID_SIZE, PLOT_GRID_SIZE),
  );
  const carrotRefs = useRef<Array<Array<RefObject<THREE.Group>>>>(
    generateRefGrid<THREE.Group>(PLOT_GRID_SIZE, PLOT_GRID_SIZE),
  );
  const potatoRefs = useRef<Array<Array<RefObject<THREE.Group>>>>(
    generateRefGrid<THREE.Group>(PLOT_GRID_SIZE, PLOT_GRID_SIZE),
  );
  const cornRefs = useRef<Array<Array<RefObject<THREE.Group>>>>(
    generateRefGrid<THREE.Group>(PLOT_GRID_SIZE, PLOT_GRID_SIZE),
  );

  const setPlotItem = (itemEnabled: boolean, itemMesh: THREE.Mesh | THREE.Group | null, plotMesh: PlotMesh | null) => {
    if (!itemMesh || !plotMesh) {
      return;
    }

    if (!itemEnabled) {
      itemMesh.position.setZ(-5);
      return;
    }

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(plotMesh.matrixWorld);

    itemMesh.position.copy(position);
    itemMesh.position.setZ(0.2);
  };

  // TODO: investigate better way to update ref positions (Too many arguments)
  const applyMappedPlotInfos = (
    mainPlotRefs_: Array<Array<RefObject<PlotMesh>>>,

    currentPlantRefs: Array<Array<RefObject<THREE.Mesh>>>,
    currentWeedRefs: Array<Array<RefObject<THREE.Group>>>,

    currentCornRefs: Array<Array<RefObject<THREE.Group>>>,
    currentPotatoRefs: Array<Array<RefObject<THREE.Group>>>,
    currentCarrotRefs: Array<Array<RefObject<THREE.Group>>>,

    currentMappedPlotInfos: MappedPlotInfos,
  ): void => {
    for (let x = 0; x < PLOT_GRID_SIZE; x += 1) {
      if (!currentMappedPlotInfos?.[x]) {
        continue;
      }

      for (let y = 0; y < PLOT_GRID_SIZE; y += 1) {
        if (!currentMappedPlotInfos?.[x]?.[y] || !mainPlotRefs_[y][x].current) {
          continue;
        }

        // TODO: investigate why needs default
        const plotRgb = currentMappedPlotInfos?.[x][y].color.rgb || getDefaultPlotColor().rgb;

        mainPlotRefs_[y][x].current?.material.color.setRGB(plotRgb.r, plotRgb.g, plotRgb.b);

        const { seedType, plantState } = currentMappedPlotInfos?.[x][y] || { seedType: undefined, state: undefined };

        setPlotItem(plantState === PlantState.GROWING, currentPlantRefs[x][y].current, mainPlotRefs_[y][x].current);

        setPlotItem(
          seedType === SEED_TYPE.CORN && plantState === PlantState.READY,
          currentCornRefs[x][y].current,
          mainPlotRefs_[y][x].current,
        );

        setPlotItem(
          seedType === SEED_TYPE.POTATO && plantState === PlantState.READY,
          currentPotatoRefs[x][y].current,
          mainPlotRefs_[y][x].current,
        );

        setPlotItem(
          seedType === SEED_TYPE.CARROT && plantState === PlantState.READY,
          currentCarrotRefs[x][y].current,
          mainPlotRefs_[y][x].current,
        );

        setPlotItem(plantState === PlantState.OVERGROWN, currentWeedRefs[x][y].current, mainPlotRefs_[y][x].current);
      }
    }
  };

  useEffect(
    () =>
      mappedPlotInfosStore.onChange((newMappedPlotInfos: MappedPlotInfos) => {
        if (JSON.stringify(newMappedPlotInfos) === JSON.stringify(mappedPlotInfos.current)) {
          return;
        }

        mappedPlotInfos.current = { ...newMappedPlotInfos };

        applyMappedPlotInfos(
          mainPlotRefs,
          plantRefs.current,
          weedRefs.current,
          cornRefs.current,
          potatoRefs.current,
          carrotRefs.current,
          mappedPlotInfos.current,
        );
      }),
    [],
  );

  return (
    <>
      {mainPlotRefs.map((r, yIndex) =>
        r.map((c, xIndex) => (
          <Fragment key={`plot-${yIndex}${xIndex}`}>
            <Plot
              ref={c}
              onPointerDown={() => {
                if (!mappedPlotInfos?.current?.[xIndex]?.[yIndex]) {
                  return;
                }

                const coordinates = {
                  x: plotCenterRef.current.x + (xIndex - 3),
                  y: plotCenterRef.current.y + (yIndex - 3),
                };

                const plotInfo = mappedPlotInfos?.current?.[xIndex]?.[yIndex];

                selectPlotStore.setValue({
                  ...coordinates,
                  plotInfo,
                });
              }}
              onPointerOut={(self) => {
                if (!mappedPlotInfos?.current) {
                  return;
                }
                const rgb = mappedPlotInfos?.current?.[xIndex]?.[yIndex]?.color?.rgb;
                if (!rgb) {
                  return;
                }
                self.eventObject.material.color.setRGB(rgb.r, rgb.g, rgb.b);
              }}
              onPointerOver={(self) => {
                if (!mappedPlotInfos?.current) {
                  return;
                }
                const rgbHover = mappedPlotInfos?.current?.[xIndex]?.[yIndex]?.color?.rgbHover;
                if (!rgbHover) {
                  return;
                }
                self.eventObject.material.color.setRGB(rgbHover.r, rgbHover.g, rgbHover.b);
              }}
            />
            <Plant ref={plantRefs.current[xIndex][yIndex]} />
            <WeedGroup ref={weedRefs.current[xIndex][yIndex]} />
            <CornGroup ref={cornRefs.current[xIndex][yIndex]} />
            <PotatoGroup ref={potatoRefs.current[xIndex][yIndex]} />
            <CarrotGroup ref={carrotRefs.current[xIndex][yIndex]} />
          </Fragment>
        )),
      )}
    </>
  );
});

export default MainPlots;
