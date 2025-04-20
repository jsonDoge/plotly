import { PlotColor } from './interfaces';

// GREEN
const greenHover = {
  r: 0.2578125,
  g: 0.74609375,
  b: 0.34765625,
};
const green = {
  r: 0.19806931954941637,
  g: 0.5332764040016892,
  b: 0.24620132669705552,
};
const greenHex = '#7BC188';

// BLUE
const blueHover = {
  r: 0.2578125,
  g: 0.34765625,
  b: 0.74609375,
};
const blue = {
  r: 0.19806931954941637,
  g: 0.24620132669705552,
  b: 0.5332764040016892,
};
const blueHex = '#7B88C1';

// YELLOW-ish
const yellowHover = {
  r: 0.74609375,
  g: 0.34765625,
  b: 0.2578125,
};
const yellow = {
  r: 0.5332764040016892,
  g: 0.24620132669705552,
  b: 0.19806931954941637,
};
const yellowHex = '#C1887B';

export const getPlotColor = (isOwner: boolean, isPlantOwner: boolean, isUnminted: boolean): PlotColor => {
  if (isOwner || isPlantOwner) {
    return {
      rgb: yellow,
      rgbHover: yellowHover,
      hex: yellowHex,
    };
  }

  if (isUnminted) {
    return {
      rgb: green,
      rgbHover: greenHover,
      hex: greenHex,
    };
  }

  return {
    rgb: blue,
    rgbHover: blueHover,
    hex: blueHex,
  };
};

export const getDefaultPlotColor = (): PlotColor => ({
  rgb: green,
  rgbHover: greenHover,
  hex: greenHex,
});
