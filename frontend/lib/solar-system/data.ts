/**
 * The services index as a solar system: the Sun plus the eight planets, in
 * order, each mapped to a service by position (body 0 = service 01).
 *
 * Nothing here is to astronomical scale, on purpose:
 * - sizes keep the real ordering (Sun >>> Jupiter > Saturn > Uranus ≈
 *   Neptune > Earth ≈ Venus > Mars > Mercury) but are compressed, roughly
 *   real radius ^ 0.45, so Mercury stays visible next to Jupiter
 * - orbits keep the real order with compressed spacing (a blend of log
 *   distance and even steps), so the outer planets aren't off-screen
 * - periods keep the real hierarchy (Mercury fastest, Neptune slowest),
 *   accelerated as real period ^ 0.55 with Earth at 30s per orbit
 * - moons are a small curated set of major, recognisable moons per planet;
 *   inner moons orbit faster than outer ones, Triton orbits backwards;
 *   `ratio` is each moon's true radius over its planet's (mean radii in
 *   km), used when its planet is in focus
 *
 * Units: `size` is a body's visual radius in Earth radii (scaled to pixels
 * by the renderer), `orbit` is 0..1 between the innermost and outermost
 * orbit, moon `orbitRadius` is in parent radii, periods are seconds.
 */

export type SurfaceId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type MoonData = {
  id: string;
  name: string;
  /** visual radius, Earth radii */
  size: number;
  /** distance from the parent's centre, in parent radii */
  orbitRadius: number;
  /** seconds per orbit */
  period: number;
  /** angle at t = 0, radians */
  phase: number;
  /** tilt of this moon's orbit relative to the parent's equatorial plane, degrees */
  inclination: number;
  /** 1 = prograde, -1 = retrograde (Triton) */
  direction: 1 | -1;
  /** true radius relative to the parent planet (sizes the moon when its planet is in focus) */
  ratio: number;
  color: string;
  /** kept when the system is drawn small (phones) */
  essential?: boolean;
};

export type RingData = {
  /** in parent radii */
  inner: number;
  outer: number;
  color: string;
  opacity: number;
};

export type BodyData = {
  id: string;
  name: string;
  surface: SurfaceId;
  /** visual radius, Earth radii */
  size: number;
  /** 0 = innermost orbit, 1 = outermost (unused for the Sun) */
  orbit: number;
  /** seconds per orbit (unused for the Sun) */
  period: number;
  phase: number;
  /** on-screen tilt of the equatorial plane (bands, rings, moons), degrees */
  planeTilt: number;
  /** how foreshortened the equatorial plane appears (1 = face-on) */
  planeFlatten: number;
  atmosphere?: string;
  rings?: RingData;
  moons: MoonData[];
};

const TAU = Math.PI * 2;

export const BODIES: BodyData[] = [
  {
    id: "sun",
    name: "Sun",
    surface: "sun",
    size: 6.4,
    orbit: 0,
    period: 0,
    phase: 0,
    planeTilt: 0,
    planeFlatten: 1,
    moons: [],
  },
  {
    id: "mercury",
    name: "Mercury",
    surface: "mercury",
    size: 0.58,
    orbit: 0,
    period: 13.7,
    phase: TAU * 0.07,
    planeTilt: 0,
    planeFlatten: 0.35,
    moons: [],
  },
  {
    id: "venus",
    name: "Venus",
    surface: "venus",
    size: 0.95,
    orbit: 0.14,
    period: 23,
    phase: TAU * 0.62,
    planeTilt: 0,
    planeFlatten: 0.35,
    atmosphere: "rgba(255, 228, 170, 0.55)",
    moons: [],
  },
  {
    id: "earth",
    name: "Earth",
    surface: "earth",
    size: 1,
    orbit: 0.25,
    period: 30,
    phase: TAU * 0.3,
    planeTilt: -8,
    planeFlatten: 0.42,
    atmosphere: "rgba(120, 180, 255, 0.6)",
    moons: [
      {
        id: "moon",
        name: "Moon",
        size: 0.32,
        ratio: 1737 / 6371,
        orbitRadius: 2.6,
        period: 13,
        phase: 0.8,
        inclination: 5,
        direction: 1,
        color: "#a9a49c",
        essential: true,
      },
    ],
  },
  {
    id: "mars",
    name: "Mars",
    surface: "mars",
    size: 0.72,
    orbit: 0.37,
    period: 42,
    phase: TAU * 0.86,
    planeTilt: -10,
    planeFlatten: 0.4,
    moons: [
      {
        id: "phobos",
        name: "Phobos",
        size: 0.15,
        ratio: 11.3 / 3390,
        orbitRadius: 1.9,
        period: 5,
        phase: 0.2,
        inclination: 1,
        direction: 1,
        color: "#7a6e64",
        essential: true,
      },
      {
        id: "deimos",
        name: "Deimos",
        size: 0.12,
        ratio: 6.2 / 3390,
        orbitRadius: 2.7,
        period: 11,
        phase: 2.6,
        inclination: 2,
        direction: 1,
        color: "#8a7f74",
      },
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    surface: "jupiter",
    size: 2.95,
    orbit: 0.58,
    period: 117,
    phase: TAU * 0.18,
    planeTilt: -3,
    planeFlatten: 0.3,
    moons: [
      {
        id: "amalthea",
        name: "Amalthea",
        size: 0.15,
        ratio: 83 / 69911,
        orbitRadius: 1.5,
        period: 5.5,
        phase: 4.1,
        inclination: 0.5,
        direction: 1,
        color: "#9b5a43",
      },
      {
        id: "io",
        name: "Io",
        size: 0.4,
        ratio: 1822 / 69911,
        orbitRadius: 1.85,
        period: 8.5,
        phase: 0.6,
        inclination: 1,
        direction: 1,
        color: "#d6c45e",
        essential: true,
      },
      {
        id: "europa",
        name: "Europa",
        size: 0.36,
        ratio: 1561 / 69911,
        orbitRadius: 2.2,
        period: 13,
        phase: 2.2,
        inclination: 2,
        direction: 1,
        color: "#d9d0bf",
        essential: true,
      },
      {
        id: "ganymede",
        name: "Ganymede",
        size: 0.5,
        ratio: 2634 / 69911,
        orbitRadius: 2.6,
        period: 20,
        phase: 3.7,
        inclination: 1.5,
        direction: 1,
        color: "#a39584",
        essential: true,
      },
      {
        id: "callisto",
        name: "Callisto",
        size: 0.46,
        ratio: 2410 / 69911,
        orbitRadius: 3.05,
        period: 33,
        phase: 5.4,
        inclination: 3,
        direction: 1,
        color: "#76695b",
        essential: true,
      },
    ],
  },
  {
    id: "saturn",
    name: "Saturn",
    surface: "saturn",
    size: 2.62,
    orbit: 0.72,
    period: 193,
    phase: TAU * 0.71,
    planeTilt: -18,
    planeFlatten: 0.32,
    rings: { inner: 1.24, outer: 2.2, color: "#d9c79a", opacity: 0.85 },
    moons: [
      {
        id: "enceladus",
        name: "Enceladus",
        size: 0.16,
        ratio: 252 / 58232,
        orbitRadius: 2.45,
        period: 7.5,
        phase: 1.1,
        inclination: 0.5,
        direction: 1,
        color: "#eef1f3",
      },
      {
        id: "dione",
        name: "Dione",
        size: 0.22,
        ratio: 561 / 58232,
        orbitRadius: 2.75,
        period: 11,
        phase: 3.9,
        inclination: 1,
        direction: 1,
        color: "#c9c6c0",
      },
      {
        id: "rhea",
        name: "Rhea",
        size: 0.26,
        ratio: 764 / 58232,
        orbitRadius: 3.05,
        period: 16,
        phase: 5.6,
        inclination: 1.5,
        direction: 1,
        color: "#bdb8b0",
      },
      {
        id: "titan",
        name: "Titan",
        size: 0.48,
        ratio: 2575 / 58232,
        orbitRadius: 3.5,
        period: 30,
        phase: 2.4,
        inclination: 2.5,
        direction: 1,
        color: "#d49a48",
        essential: true,
      },
    ],
  },
  {
    // Uranus is tipped on its side, so its moons circle it almost end-on
    id: "uranus",
    name: "Uranus",
    surface: "uranus",
    size: 1.85,
    orbit: 0.87,
    period: 342,
    phase: TAU * 0.44,
    planeTilt: 82,
    planeFlatten: 0.55,
    atmosphere: "rgba(170, 235, 240, 0.5)",
    // narrow, faint rings (the brightest, epsilon, is only tens of km wide)
    rings: { inner: 1.63, outer: 1.68, color: "#a9d6dc", opacity: 0.2 },
    moons: [
      {
        id: "ariel",
        name: "Ariel",
        size: 0.22,
        ratio: 579 / 25362,
        orbitRadius: 2.0,
        period: 9,
        phase: 0.4,
        inclination: 1,
        direction: 1,
        color: "#b9b4ad",
      },
      {
        id: "titania",
        name: "Titania",
        size: 0.26,
        ratio: 789 / 25362,
        orbitRadius: 2.6,
        period: 18,
        phase: 2.9,
        inclination: 2,
        direction: 1,
        color: "#aaa39b",
        essential: true,
      },
      {
        id: "oberon",
        name: "Oberon",
        size: 0.25,
        ratio: 761 / 25362,
        orbitRadius: 3.1,
        period: 27,
        phase: 4.8,
        inclination: 3,
        direction: 1,
        color: "#9c948b",
      },
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    surface: "neptune",
    size: 1.8,
    orbit: 1,
    period: 499,
    phase: TAU * 0.93,
    planeTilt: -12,
    planeFlatten: 0.45,
    atmosphere: "rgba(110, 150, 255, 0.5)",
    moons: [
      {
        id: "proteus",
        name: "Proteus",
        size: 0.15,
        ratio: 210 / 24622,
        orbitRadius: 1.8,
        period: 8,
        phase: 1.7,
        inclination: 1,
        direction: 1,
        color: "#857c74",
      },
      {
        // Triton orbits backwards (retrograde) on a steeply tilted orbit
        id: "triton",
        name: "Triton",
        size: 0.34,
        ratio: 1353 / 24622,
        orbitRadius: 2.8,
        period: 17,
        phase: 4.2,
        inclination: 23,
        direction: -1,
        color: "#d9c9c1",
        essential: true,
      },
    ],
  },
];
