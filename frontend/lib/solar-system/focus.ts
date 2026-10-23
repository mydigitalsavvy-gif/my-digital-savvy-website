import type { MapId } from "./textures";

/**
 * How each body looks when it is the focus of the camera: the maps its
 * rotating globe is drawn from, how fast the surface and its clouds turn,
 * how its latitude bands drift, where its vortex is, and how far its
 * effects reach (so the focused view can be fitted to the canvas).
 *
 * Map coordinates are fractions: x = longitude / 360° + 0.5 (0.5 faces us
 * at rest), y = 0 at the north pole … 1 at the south pole. Periods are
 * seconds per turn, accelerated for the page; a negative period turns the
 * other way (Venus and Uranus rotate backwards).
 */

export type FocusStyle = {
  map: MapId;
  /** a second layer: clouds for planets, counter-flowing granulation for the Sun */
  clouds?: MapId;
  cloudOpacity?: number;
  spin: number;
  cloudSpin?: number;
  kind: "lit" | "sun";
  ambient: number;
  limb: number;
  specular?: number;
  /** extra drift of the band at a latitude (radians), in turns per second */
  bands?: (lat: number) => number;
  /** vortex in map coordinates, turning at `rate` radians per second */
  vortex?: { x: number; y: number; rx: number; ry: number; rate: number };
  /** how far the body's effects reach, in body radii */
  reach: number;
  /** focused size relative to the largest focused planet */
  size: number;
};

const TAU = Math.PI * 2;

export const FOCUS: Record<string, FocusStyle> = {
  sun: {
    map: "sunGranules",
    clouds: "sunGranules",
    spin: 150,
    cloudSpin: -95,
    kind: "sun",
    ambient: 1,
    limb: 0,
    reach: 2.05,
    size: 1.12,
  },
  mercury: {
    map: "mercury",
    spin: 95,
    kind: "lit",
    ambient: 0.025,
    limb: 0.1,
    reach: 1.75,
    size: 0.6,
  },
  venus: {
    map: "venus",
    clouds: "venusClouds",
    cloudOpacity: 0.9,
    spin: -260,
    cloudSpin: -40,
    kind: "lit",
    ambient: 0.1,
    limb: 0.32,
    reach: 1.5,
    size: 0.7,
  },
  earth: {
    map: "earthLand",
    clouds: "earthClouds",
    cloudOpacity: 1,
    spin: 64,
    cloudSpin: 46,
    kind: "lit",
    ambient: 0.035,
    limb: 0.18,
    specular: 0.7,
    reach: 1.45,
    size: 0.72,
  },
  mars: {
    map: "mars",
    spin: 66,
    kind: "lit",
    ambient: 0.04,
    limb: 0.14,
    reach: 1.75,
    size: 0.65,
  },
  jupiter: {
    map: "jupiter",
    spin: 36,
    kind: "lit",
    ambient: 0.05,
    limb: 0.36,
    // zonal jets: neighbouring bands drift against each other
    bands: (lat) => 0.006 * Math.sin(lat * 9.5 + 0.5),
    // the Great Red Spot (anticyclone: counter-clockwise in the south)
    vortex: {
      x: 0.5 + 0.5 / TAU,
      y: 0.5 + 0.36 / Math.PI,
      rx: 0.32 / TAU,
      ry: 0.11 / Math.PI,
      rate: 0.8,
    },
    reach: 1.2,
    size: 1,
  },
  saturn: {
    map: "saturn",
    spin: 40,
    kind: "lit",
    ambient: 0.05,
    limb: 0.34,
    bands: (lat) => 0.003 * Math.sin(lat * 8 + 1),
    reach: 1.2,
    size: 0.96,
  },
  uranus: {
    map: "uranus",
    spin: -72,
    kind: "lit",
    ambient: 0.06,
    limb: 0.3,
    bands: (lat) => 0.002 * Math.sin(lat * 4),
    reach: 1.65,
    size: 0.86,
  },
  neptune: {
    map: "neptune",
    spin: 50,
    kind: "lit",
    ambient: 0.05,
    limb: 0.3,
    // the fastest winds in the solar system: bands race past each other
    bands: (lat) => 0.012 * Math.cos(lat * 2) - 0.004,
    vortex: {
      x: 0.5 + 0.9 / TAU,
      y: 0.5 + 0.35 / Math.PI,
      rx: 0.3 / TAU,
      ry: 0.1 / Math.PI,
      rate: -0.9,
    },
    reach: 1.75,
    size: 0.86,
  },
};
