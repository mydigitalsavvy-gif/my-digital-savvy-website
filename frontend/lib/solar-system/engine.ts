import { BODIES, type BodyData, type MoonData } from "./data";
import { mulberry32, renderSphere, type MapId } from "./textures";
import { makeLut, renderGlobe, type GlobeLut, type GlobeStyle } from "./globe";
import {
  createEffect,
  flushParticles,
  type Effect,
  type EffectEnv,
} from "./effects";
import { FOCUS, type FocusStyle } from "./focus";
import { createMapStore, type MapStore } from "./maps";

/**
 * Canvas 2D renderer for the services solar system.
 *
 * World. The orbital plane is drawn tilted: every orbit is an ellipse
 * around the Sun with the same foreshortening `k`, so the system reads as
 * one plane in depth. In a tall box (desktop) the long axis is vertical; in
 * a wide box (phone band, reduced-motion strip) it is horizontal. Each
 * moon's position is its parent's position plus its own orbit, every frame.
 *
 * Camera. The scroll position `s` (0 = service 01 … 8 = service 09, see
 * ServicesScroll) drives a virtual camera: world → (world − centre) × zoom
 * + focus point. Between two services the camera pans from one body to the
 * next and pulls back a little on the way; the outgoing body recedes and
 * the incoming one comes forward in depth (it grows, sharpens, brightens and
 * its effects build up), so exactly one body dominates at any moment. Its
 * moons, rings and effects are in its own frame and scale with it.
 *
 * Focused bodies are drawn as rotating, sunlit globes (globe.ts) with their
 * own environment (effects.ts); the rest of the system keeps its cheap
 * static sprites and dims with distance from the focus.
 *
 * Nothing here touches React or the page's CSS: per-frame values live in
 * this closure, and the only output is pixels on the canvas.
 */

export type SolarOptions = {
  /** number of real service panels; bodies beyond it are background only */
  count: number;
  reducedMotion: boolean;
  /** the site's resolved font family, used for the labels */
  fontFamily: string;
  /** phones: 30fps, smaller particle budgets and globes, fewer moons */
  lowPower: boolean;
  /**
   * continuous scroll position: services at 0 … count-1, plus an arrival
   * stretch before the first (-1…0) and a departure after the last
   */
  progress?: () => number;
  /** each service's own colour (the panels' --c) */
  colors?: string[];
};

export type SolarSnapshot = {
  mode: "vertical" | "horizontal";
  width: number;
  height: number;
  time: number;
  /** the scroll position the camera is showing (damped) */
  s: number;
  active: number;
  k: number;
  camera: { x: number; y: number; z: number; fx: number; fy: number };
  bodies: {
    id: string;
    /** world position (orbital plane, before the camera) */
    wx: number;
    wy: number;
    /** screen position and radius */
    x: number;
    y: number;
    rs: number;
    r: number;
    R: number;
    theta: number;
    depth: number;
    scale: number;
    focus: number;
    globe: boolean;
    particles: number;
  }[];
  moons: {
    id: string;
    parent: string;
    x: number;
    y: number;
    a: number;
    rho: number;
    f: number;
  }[];
  maps: number;
};

export type SolarEngine = {
  resize(width: number, height: number): void;
  setActive(index: number, accent: string): void;
  start(): void;
  stop(): void;
  renderOnce(): void;
  destroy(): void;
  snapshot(): SolarSnapshot;
};

type RGB = [number, number, number];

type MoonState = {
  data: MoonData;
  /** orbit radius in world px */
  a: number;
  r: number;
  rho: number;
  f: number;
  color: RGB;
  x: number;
  y: number;
  depth: number;
  /** orbit radius factor while the planet is in focus (orbits may tighten to fit) */
  fit: number;
};

type GlobeState = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  D: number;
  shift: number;
  cshift: number;
  lx: number;
  ly: number;
  at: number;
  ready: boolean;
};

type BodyState = {
  data: BodyData;
  index: number;
  style: FocusStyle;
  /** world radius */
  r: number;
  R: number;
  rho: number;
  theta: number;
  wx: number;
  wy: number;
  x: number;
  y: number;
  /** screen radius */
  rs: number;
  /** depth-of-focus magnification */
  mag: number;
  depth: number;
  focus: number;
  /** focused screen radius and the zoom it is framed at */
  fR: number;
  fZ: number;
  extY: number;
  moons: MoonState[];
  sprite: HTMLCanvasElement | null;
  spriteSize: number;
  ringColor: RGB;
  atmosphere: { color: RGB; alpha: number } | null;
  atmoSprite: HTMLCanvasElement | null;
  color: RGB;
  globe: GlobeState | null;
  effect: Effect | null;
  bands: Float32Array | null;
};

type Star = { x: number; y: number; r: number; a: number };

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** room each planet system needs in the background layout */
const GROW = 1.32 * 1.1;
/** Saturn-style ring bands: [from, to, opacity] as fractions of ring width */
const SATURN_RINGS: [number, number, number][] = [
  [0, 0.29, 0.22],
  [0.29, 0.73, 0.95],
  [0.79, 1, 0.62],
];
const SINGLE_RING: [number, number, number][] = [[0, 1, 1]];
/** camera smoothing of the scroll position (seconds) */
const DAMP = 0.11;
/** how far the camera pulls back mid-transition */
const DIP = 0.16;
/** the Sun's size when something else has the focus */
const SUN_BACK = 0.6;
/** zoom while a planet (not the Sun) has the focus */
const PLANET_ZOOM = 1.1;
/** phone band: height of the soft fade along its top edge, px */
const TOP_FADE = 14;
const MAP_ROWS = 128;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const smoother = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
/** transition timing: the outgoing body recedes first, the next one arrives */
const leave = (t: number) => 1 - smooth(0.12, 0.5, t);
const enter = (t: number) => smooth(0.38, 0.84, t);

function parseColor(input: string, fallback: RGB): RGB {
  const s = input.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(s);
  if (short)
    return [0, 1, 2].map((i) => parseInt(short[1][i] + short[1][i], 16)) as RGB;
  const long = /^#([0-9a-f]{6})$/i.exec(s);
  if (long)
    return [0, 2, 4].map((i) => parseInt(long[1].slice(i, i + 2), 16)) as RGB;
  const fn =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i.exec(
      s
    );
  if (fn) return [+fn[1], +fn[2], +fn[3]];
  return fallback;
}

function parseAlpha(input: string): number {
  const fn = /^rgba?\([^)]*?[,\s/]([\d.]+)\s*\)$/i.exec(input.trim());
  return fn ? clamp(+fn[1], 0, 1) : 1;
}

const rgba = (c: RGB, a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`;
const tint = (c: RGB, k: number): RGB => [
  Math.min(255, c[0] * k),
  Math.min(255, c[1] * k),
  Math.min(255, c[2] * k),
];

/** half-size of a rotated, foreshortened circle of radius a along one screen axis */
function ellipseHalf(a: number, rho: number, f: number, axis: "x" | "y") {
  const c = Math.cos(rho);
  const s = Math.sin(rho);
  return axis === "x"
    ? a * Math.sqrt(c * c + f * f * s * s)
    : a * Math.sqrt(s * s + f * f * c * c);
}

/** a soft rim glow for planets with atmospheres, drawn once per size */
function renderAtmosphere(b: BodyState, planetSize: number) {
  const atmo = b.atmosphere;
  const c = document.createElement("canvas");
  const D = Math.max(8, Math.round(planetSize * 1.3));
  c.width = D;
  c.height = D;
  const o = c.getContext("2d");
  if (!o || !atmo) return c;
  const R = D / 2;
  const r = R / 1.3;
  const g = o.createRadialGradient(R, R, r * 0.9, R, R, R);
  g.addColorStop(0, rgba(atmo.color, 0));
  g.addColorStop(0.28, rgba(atmo.color, atmo.alpha * 0.85));
  g.addColorStop(1, rgba(atmo.color, 0));
  o.fillStyle = g;
  o.fillRect(0, 0, D, D);
  return c;
}

const NOOP: SolarEngine = {
  resize() {},
  setActive() {},
  start() {},
  stop() {},
  renderOnce() {},
  destroy() {},
  snapshot: () => ({
    mode: "vertical",
    width: 0,
    height: 0,
    time: 0,
    s: 0,
    active: -1,
    k: 0,
    camera: { x: 0, y: 0, z: 1, fx: 0, fy: 0 },
    bodies: [],
    moons: [],
    maps: 0,
  }),
};

export function createSolarSystem(
  canvas: HTMLCanvasElement,
  opts: SolarOptions
): SolarEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return NOOP;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let W = 1;
  let H = 1;
  let dpr = 1;
  let vertical = true;
  let compact = false;
  let cx = 0;
  let cy = 0;
  let k = 0.25;
  let unit = 3;
  let time = 0;
  let last = 0;
  let acc = 0;
  let raf = 0;
  let running = false;
  let active = 0;
  let accent: RGB = [1, 254, 251];
  let stars: Star[] = [];
  let sunSprites: HTMLCanvasElement[] = [];
  let sunSpriteSize = 0;
  let starPad = 0;
  let fade: CanvasGradient | null = null;
  let fadeTop: CanvasGradient | null = null;
  // camera
  let sNow = 0;
  let camX = 0;
  let camY = 0;
  let camZ = 1;
  let fx = 0;
  let fy = 0;
  const maxS = Math.max(0, Math.min(opts.count, BODIES.length) - 1);
  const budget = opts.lowPower ? 100 : 300;
  const maxD = opts.lowPower ? 160 : 256;
  const luts = new Map<number, GlobeLut>();
  // one-time setup done in idle time (see warmUp), never mid-transition
  let warmId = 0;
  let warmQueue: (() => void)[] = [];
  const labels = new Map<
    string,
    { canvas: HTMLCanvasElement; w: number; h: number }
  >();
  const order = new Int8Array(BODIES.length - 1);
  for (let i = 0; i < order.length; i++) order[i] = i + 1;

  const bodies: BodyState[] = BODIES.map((data, index) => ({
    data,
    index,
    style: FOCUS[data.id],
    r: 1,
    R: 0,
    rho: data.planeTilt * DEG,
    theta: data.phase,
    wx: 0,
    wy: 0,
    x: 0,
    y: 0,
    rs: 1,
    mag: 1,
    depth: 0,
    focus: 0,
    fR: 10,
    fZ: 1,
    extY: 1.3,
    moons: [],
    sprite: null,
    spriteSize: 0,
    ringColor: parseColor(data.rings?.color ?? "#ffffff", [255, 255, 255]),
    atmoSprite: null,
    atmosphere: data.atmosphere
      ? {
          color: parseColor(data.atmosphere, [255, 255, 255]),
          alpha: parseAlpha(data.atmosphere),
        }
      : null,
    color: accent,
    globe: null,
    effect: null,
    bands: null,
  }));
  const sun = bodies[0];
  const mapped = (i: number) => i >= 0 && i <= maxS;
  const setColors = () => {
    for (const b of bodies) {
      const c = opts.colors?.[b.index];
      b.color = c ? parseColor(c, accent) : accent;
    }
  };
  setColors();

  // globe maps, nearest services first; seeds match the static sprites so a
  // planet keeps its continents and storms when it starts to turn
  const seedOf = (i: number) => (i === 0 ? 11 : 101 + i * 17);
  const jobs: { id: MapId; seed: number }[] = [];
  for (const b of bodies) {
    jobs.push({ id: b.style.map, seed: seedOf(b.index) });
    if (b.style.clouds && b.style.clouds !== b.style.map)
      jobs.push({ id: b.style.clouds, seed: seedOf(b.index) });
  }
  const maps: MapStore | null = opts.reducedMotion
    ? null
    : createMapStore(jobs);

  /** half-extent of a planet's local system (body, rings, moons) on one axis */
  function systemHalf(b: BodyState, axis: "x" | "y") {
    let ext = b.r * GROW;
    const d = b.data;
    if (d.rings)
      ext = Math.max(
        ext,
        ellipseHalf(d.rings.outer * b.r * GROW, b.rho, d.planeFlatten, axis)
      );
    for (const m of b.moons)
      ext = Math.max(
        ext,
        ellipseHalf(m.a * GROW, m.rho, m.f, axis) + m.r * 1.2
      );
    return ext + 2;
  }

  /** extent of the focused body itself (effects, rings), in body radii */
  function bodyExtent(b: BodyState, axis: "x" | "y") {
    // in the short phone band only the faintest rim of the Sun's corona
    // may run past the band's edges (both fade out); its flames, and most
    // of the corona, must fit
    let ext = b.index === 0 && !vertical ? 1.7 : b.style.reach;
    const d = b.data;
    if (d.rings)
      ext = Math.max(
        ext,
        ellipseHalf(d.rings.outer, b.rho, d.planeFlatten, axis) + 0.06
      );
    return ext;
  }

  /** extent of the focused body's moon system, in body radii (0 = no moons) */
  function moonExtent(b: BodyState, axis: "x" | "y") {
    let ext = 0;
    for (const m of b.moons)
      ext = Math.max(
        ext,
        ellipseHalf(m.a / b.r, m.rho, m.f, axis) + focusMoon(m) * 1.3
      );
    return ext;
  }

  /** a moon's radius relative to its planet while the planet is in focus */
  function focusMoon(m: MoonState) {
    return Math.pow(m.data.ratio, 0.7);
  }

  function layout() {
    vertical = H > W * 1.15;
    const major = vertical ? H : W;
    const minor = vertical ? W : H;
    compact = opts.lowPower || minor < 150;
    const sunR = vertical
      ? clamp(Math.min(W * 0.13, H * 0.036), 7, 34)
      : clamp(Math.min(H * 0.17, W * 0.045), 6, 30);
    unit = sunR / BODIES[0].size;
    cx = W / 2;
    cy = H / 2;
    fx = W / 2;
    fy = H / 2;

    for (const b of bodies) {
      b.r =
        b.index === 0
          ? sunR
          : Math.max(compact ? 0.9 : 1.2, unit * b.data.size);
      const list = compact
        ? b.data.moons.filter((m) => m.essential)
        : b.data.moons;
      b.moons = list.map((m) => ({
        data: m,
        a: m.orbitRadius * b.r,
        r: Math.max(compact ? 0.6 : 0.85, unit * m.size),
        rho: b.rho + m.inclination * DEG,
        f: clamp(b.data.planeFlatten * (1 + m.inclination / 60), 0.12, 0.95),
        color: parseColor(m.color, [160, 160, 160]),
        x: 0,
        y: 0,
        depth: 0,
        fit: 1,
      }));
    }

    const majAxis = vertical ? "y" : "x";
    const minAxis = vertical ? "x" : "y";
    const outer = bodies[bodies.length - 1];
    const inner = bodies[1];
    const rMax = major / 2 - systemHalf(outer, majAxis) - 4;
    const rMin =
      sunR * 1.1 + systemHalf(inner, majAxis) + Math.max(4, sunR * 0.3);
    const span = Math.max(8, rMax - rMin);
    for (const b of bodies) if (b.index > 0) b.R = rMin + span * b.data.orbit;

    let fit = 0.34;
    for (const b of bodies)
      if (b.index > 0)
        fit = Math.min(fit, (minor / 2 - 3 - systemHalf(b, minAxis)) / b.R);
    k = clamp(fit, 0.07, 0.34);

    // focused size of each body: as large as its whole system (rings, moons,
    // effects) fits around the focus point, within a cap per body
    const capR = vertical
      ? Math.min(W * 0.25, H * 0.115)
      : Math.min(W * 0.2, H * 0.4);
    const hx = Math.min(fx, W - fx) - 8;
    // the phone band's top edge is the top of the screen: keep the focused
    // body a little further from it than the soft fade (see edgeFade)
    const hy = Math.min(fy, H - fy) - (vertical ? 8 : TOP_FADE + 4);
    // Planets share one scale so their focused views keep the real order
    // (Jupiter > Saturn > Uranus ≈ Neptune > Earth ≈ Venus > Mars >
    // Mercury), compressed so even Mercury fills the frame. In focus a
    // moon system may draw its orbits in (by up to a quarter, or nearly
    // half where space is short, e.g. Uranus's upright orbits in the
    // phone band) so it never holds every planet back; the moons still
    // circle their own planet, and inner moons stay clear of its surface.
    const minFit = vertical ? 0.75 : 0.55;
    const rel = (b: BodyState) => Math.pow(b.data.size / BODIES[5].size, 0.2);
    const fitOf = (b: BodyState) =>
      Math.min(
        hx / Math.max(bodyExtent(b, "x"), moonExtent(b, "x") * minFit),
        hy / Math.max(bodyExtent(b, "y"), moonExtent(b, "y") * minFit)
      );
    let scale = capR;
    for (const b of bodies) {
      b.fZ = b.index === 0 ? 1 : PLANET_ZOOM;
      if (b.index === 0)
        b.fR = Math.max(4, Math.min(capR * b.style.size, fitOf(b)));
      else scale = Math.min(scale, fitOf(b) / rel(b));
    }
    for (const b of bodies) {
      if (b.index > 0) b.fR = Math.max(4, Math.min(scale * rel(b), fitOf(b)));
      const mx = moonExtent(b, "x");
      const my = moonExtent(b, "y");
      let fit = 1;
      if (mx) fit = Math.min(fit, hx / b.fR / mx);
      if (my) fit = Math.min(fit, hy / b.fR / my);
      fit = clamp(fit, minFit, 1);
      for (const m of b.moons)
        m.fit = Math.max(fit, (1.25 + focusMoon(m)) / (m.a / b.r));
      b.extY = Math.max(bodyExtent(b, "y"), my * fit);
    }

    const rand = mulberry32(1987);
    starPad = Math.round(Math.min(W, H) * 0.12);
    const n = Math.round(
      clamp(((W + starPad * 2) * (H + starPad * 2)) / 7000, 10, 60)
    );
    stars = Array.from({ length: n }, () => ({
      x: rand() * (W + starPad * 2),
      y: rand() * (H + starPad * 2),
      r: 0.35 + rand() * 0.7,
      a: 0.05 + rand() * 0.2,
    }));
    fade = null;
    fadeTop = null;
  }

  function ensureSprites() {
    for (const b of bodies) {
      if (b.index === 0) continue;
      const want = Math.ceil(b.r * 2 * GROW * dpr);
      if (b.sprite && want <= b.spriteSize * 1.15 && want >= b.spriteSize * 0.6)
        continue;
      b.spriteSize = clamp(want, 6, 192);
      b.atmoSprite = b.atmosphere ? renderAtmosphere(b, b.spriteSize) : null;
      b.sprite = renderSphere(
        b.data.surface,
        b.spriteSize,
        101 + b.index * 17,
        0.3
      );
    }
    const wantSun = Math.ceil(sun.r * 2 * 1.15 * dpr);
    if (
      !sunSprites.length ||
      wantSun > sunSpriteSize * 1.15 ||
      wantSun < sunSpriteSize * 0.6
    ) {
      sunSpriteSize = clamp(wantSun, 12, 256);
      sunSprites = [
        renderSphere("sun", sunSpriteSize, 11),
        renderSphere("sun", sunSpriteSize, 12, 0.6),
      ];
    }
  }

  /** orbital positions (world) for time t */
  function place(t: number) {
    sun.wx = cx;
    sun.wy = cy;
    for (const b of bodies) {
      if (b.index === 0) continue;
      const th = b.data.phase + (TAU * t) / b.data.period;
      b.theta = th;
      const c = Math.cos(th);
      const s = Math.sin(th);
      if (vertical) {
        b.wx = cx + k * b.R * c;
        b.wy = cy + b.R * s;
        b.depth = c;
      } else {
        b.wx = cx + b.R * c;
        b.wy = cy + k * b.R * s;
        b.depth = s;
      }
    }
  }

  /** focus amounts and the camera, from the (damped) scroll position */
  function focusCamera() {
    for (const b of bodies) b.focus = 0;
    // arriving, before service 01 (s in -1…0): the camera closes in on the
    // Sun from the pulled-back view of the whole system
    if (sNow < 0) {
      const u = clamp(sNow + 1, 0, 1);
      sun.focus = smooth(0.15, 1, u);
      camX = sun.wx;
      camY = sun.wy;
      camZ = sun.fZ * (1 - DIP * (1 - smooth(0, 1, u)));
      return;
    }
    // leaving, after the last service (s in maxS…maxS+1): the camera pulls
    // back from it before the stage scrolls away
    if (sNow > maxS) {
      const end = bodies[maxS];
      const v = clamp(sNow - maxS, 0, 1);
      end.focus = 1 - smooth(0, 0.85, v);
      camX = end.wx;
      camY = end.wy;
      camZ = end.fZ * (1 - DIP * smooth(0, 1, v));
      return;
    }
    const s = clamp(sNow, 0, maxS);
    const i0 = maxS > 0 ? Math.min(Math.floor(s), maxS - 1) : 0;
    const t = s - i0;
    const a = bodies[i0];
    const b = bodies[Math.min(i0 + 1, maxS)];
    // the body at a rest answers the very first pixels of scroll away from
    // it: it starts to recede at once (up to 8%), so even a single wheel
    // notch visibly begins the journey before the glide completes it
    const stir = (d: number) => 1 - 0.08 * smooth(0, 0.15, d);
    a.focus = maxS > 0 ? leave(t) * stir(t) : 1;
    if (b !== a) b.focus = enter(t) * stir(1 - t);
    const e = maxS > 0 ? smoother(0.12, 0.88, t) : 0;
    // the pull-back starts immediately too, deepest mid-way
    const w = maxS > 0 ? smooth(0, 1, t) : 0;
    camX = a.wx + (b.wx - a.wx) * e;
    camY = a.wy + (b.wy - a.wy) * e;
    camZ = (a.fZ + (b.fZ - a.fZ) * e) * (1 - DIP * Math.sin(Math.PI * w));
  }

  /** camera → screen positions and sizes, then each moon from its parent */
  function project() {
    for (const b of bodies) {
      b.x = fx + (b.wx - camX) * camZ;
      b.y = fy + (b.wy - camY) * camZ;
      const back = b.index === 0 ? SUN_BACK : 1;
      const full = b.fR / (b.r * b.fZ);
      b.mag = back + (full - back) * b.focus;
      b.rs = b.r * camZ * b.mag;
    }
    for (const b of bodies) {
      if (!b.moons.length) continue;
      const m0 = camZ * b.mag;
      for (const m of b.moons) {
        const ph =
          m.data.phase + (m.data.direction * TAU * time) / m.data.period;
        const a = m.a * m0 * (1 + (m.fit - 1) * b.focus);
        const lx = a * Math.cos(ph);
        const ly = a * m.f * Math.sin(ph);
        const cr = Math.cos(m.rho);
        const sr = Math.sin(m.rho);
        m.x = b.x + lx * cr - ly * sr;
        m.y = b.y + lx * sr + ly * cr;
        m.depth = Math.sin(ph);
      }
    }
  }

  /** brightness of a body: full in focus, falling off with distance from it */
  function dimOf(b: BodyState) {
    if (b.index === 0) return 0.62 + 0.38 * b.focus;
    const d = Math.abs(b.index - clamp(sNow, 0, maxS));
    const bg = 0.06 + 0.36 * Math.exp(-0.5 * d);
    return bg + (1 - bg) * b.focus;
  }

  /** the star field, a few batched paths (no image), drifting with the camera */
  function drawStars(px: number, py: number) {
    for (let lvl = 0; lvl < 3; lvl++) {
      ctx.beginPath();
      for (const st of stars) {
        const l = st.a < 0.1 ? 0 : st.a < 0.17 ? 1 : 2;
        if (l !== lvl) continue;
        const x = st.x - starPad + px;
        const y = st.y - starPad + py;
        if (x < -2 || y < -2 || x > W + 2 || y > H + 2) continue;
        ctx.rect(x, y, st.r * 1.6, st.r * 1.6);
      }
      ctx.fillStyle =
        lvl === 0
          ? "rgba(255,255,255,0.07)"
          : lvl === 1
            ? "rgba(255,255,255,0.13)"
            : "rgba(255,255,255,0.21)";
      ctx.fill();
    }
  }

  function drawOrbits(near: boolean) {
    const sx = fx + (cx - camX) * camZ;
    const sy = fy + (cy - camY) * camZ;
    const from = vertical
      ? near
        ? -Math.PI / 2
        : Math.PI / 2
      : near
        ? 0
        : Math.PI;
    ctx.beginPath();
    for (const b of bodies) {
      if (b.index === 0) continue;
      const rx = (vertical ? k * b.R : b.R) * camZ;
      const ry = (vertical ? b.R : k * b.R) * camZ;
      ctx.moveTo(sx + rx * Math.cos(from), sy + ry * Math.sin(from));
      ctx.ellipse(sx, sy, rx, ry, 0, from, from + Math.PI);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255,255,255,${near ? 0.075 : 0.045})`;
    ctx.stroke();
    // the focused body's orbit picks up its service colour
    for (const b of bodies) {
      if (b.index === 0 || b.focus < 0.01) continue;
      const rx = (vertical ? k * b.R : b.R) * camZ;
      const ry = (vertical ? b.R : k * b.R) * camZ;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, 0, from, from + Math.PI);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(b.color, (near ? 0.42 : 0.2) * b.focus);
      ctx.stroke();
    }
  }

  function drawRings(b: BodyState, r: number, front: boolean, dim: number) {
    const rg = b.data.rings;
    if (!rg) return;
    const inner = rg.inner * r;
    const width = (rg.outer - rg.inner) * r;
    const c = Math.cos(b.rho) * dpr;
    const sn = Math.sin(b.rho) * dpr;
    const fl = b.data.planeFlatten;
    ctx.setTransform(c, sn, -sn * fl, c * fl, b.x * dpr, b.y * dpr);
    for (const [f0, f1, op] of b.data.id === "saturn"
      ? SATURN_RINGS
      : SINGLE_RING) {
      const r0 = inner + width * f0;
      const r1 = inner + width * f1;
      ctx.beginPath();
      ctx.arc(0, 0, (r0 + r1) / 2, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.lineWidth = r1 - r0;
      ctx.strokeStyle = rgba(b.ringColor, rg.opacity * op * dim);
      ctx.stroke();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMoonOrbits(b: BodyState, front: boolean, alpha: number) {
    if (alpha <= 0.002 || !b.moons.length) return;
    const from = front ? 0 : Math.PI;
    const dir = front ? 1 : -1;
    const m0 = camZ * b.mag;
    ctx.beginPath();
    for (const m of b.moons) {
      const a = m.a * m0 * (1 + (m.fit - 1) * b.focus);
      ctx.moveTo(
        b.x + dir * a * Math.cos(m.rho),
        b.y + dir * a * Math.sin(m.rho)
      );
      ctx.ellipse(b.x, b.y, a, a * m.f, m.rho, from, from + Math.PI);
    }
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.stroke();
  }

  function drawMoon(
    m: MoonState,
    parent: BodyState,
    lx: number,
    ly: number,
    alpha: number,
    shaded: boolean
  ) {
    // system view: its own (compressed) size; in focus: its true size
    // relative to the planet, compressed, never below ~1px
    const a = parent.focus;
    const r =
      m.r * camZ * parent.mag * (1 - a) +
      Math.max(1.2, parent.rs * focusMoon(m)) * a;
    if (!shaded || r < 1.05) {
      ctx.fillStyle = rgba(m.color, alpha * 0.9);
      ctx.beginPath();
      ctx.arc(m.x, m.y, Math.max(0.6, r), 0, TAU);
      ctx.fill();
      return;
    }
    const g = ctx.createRadialGradient(
      m.x + lx * r * 0.45,
      m.y + ly * r * 0.45,
      r * 0.1,
      m.x,
      m.y,
      r * 1.05
    );
    g.addColorStop(0, rgba(tint(m.color, 1.25), alpha));
    g.addColorStop(0.55, rgba(m.color, alpha));
    g.addColorStop(1, rgba(tint(m.color, 0.28), alpha));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, TAU);
    ctx.fill();
  }

  /** the static sprite, shaded from the Sun's side and dimmed into the background */
  function drawSprite(
    b: BodyState,
    r: number,
    lx: number,
    ly: number,
    dim: number
  ) {
    if (!b.sprite) return;
    if (b.rho) {
      const c = Math.cos(b.rho) * dpr;
      const sn = Math.sin(b.rho) * dpr;
      ctx.setTransform(c, sn, -sn, c, b.x * dpr, b.y * dpr);
      ctx.drawImage(b.sprite, -r, -r, r * 2, r * 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.drawImage(b.sprite, b.x - r, b.y - r, r * 2, r * 2);
    }
    if (r < 4.5) {
      // a few pixels across: the terminator would not show, only the dimming
      if (dim < 1) {
        ctx.fillStyle = `rgba(8,8,8,${(1 - dim * 0.85).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + 0.3, 0, TAU);
        ctx.fill();
      }
      return;
    }
    const dark = 0.8 - 0.3 * b.focus;
    const g = ctx.createLinearGradient(
      b.x + lx * r,
      b.y + ly * r,
      b.x - lx * r,
      b.y - ly * r
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.45, "rgba(0,0,0,0.03)");
    g.addColorStop(0.64, `rgba(0,0,0,${(dark * 0.62).toFixed(3)})`);
    g.addColorStop(1, `rgba(0,0,0,${dark.toFixed(3)})`);
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 0.3, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    if (dim < 1) {
      ctx.fillStyle = `rgba(8,8,8,${(1 - dim).toFixed(3)})`;
      ctx.fill();
    }
  }

  /** the globe size a body is drawn at when fully in focus */
  const focusD = (b: BodyState) =>
    clamp(Math.ceil((b.fR * 2 * dpr) / 32) * 32, 32, maxD);

  /**
   * Prepares, in idle time and nearest services first, everything a body
   * needs the first time it comes into focus: its effect (particle pools,
   * sprites, the Sun's corona), its label and its globe lookup table at
   * its focused size. Done once per size; nothing here runs while the
   * page is busy, so a first visit to a planet doesn't cost a frame.
   */
  function warmUp() {
    if (opts.reducedMotion) return;
    cancelWarm();
    const here = clamp(sNow, 0, maxS);
    const order = bodies
      .slice(0, maxS + 1)
      .sort((a, b) => Math.abs(a.index - here) - Math.abs(b.index - here));
    for (const b of order) {
      warmQueue.push(() => {
        if (!b.effect)
          b.effect = createEffect(b.data.id, budget, b.data.rings ?? undefined);
        b.effect?.prepare?.(b.fR);
        labelImage(b.index, W < 120 ? 9 : 10.5);
      });
      warmQueue.push(() => void lutFor(focusD(b)));
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    const schedule = () => {
      warmId = w.requestIdleCallback
        ? w.requestIdleCallback(next, { timeout: 2000 })
        : window.setTimeout(next, 50);
    };
    const next = () => {
      warmId = 0;
      const job = warmQueue.shift();
      if (!job) return;
      job();
      schedule();
    };
    schedule();
  }

  function cancelWarm() {
    warmQueue = [];
    if (!warmId) return;
    const w = window as Window & { cancelIdleCallback?: (id: number) => void };
    if (w.cancelIdleCallback) w.cancelIdleCallback(warmId);
    else window.clearTimeout(warmId);
    warmId = 0;
  }

  function lutFor(D: number) {
    let l = luts.get(D);
    if (!l) {
      l = makeLut(D);
      luts.set(D, l);
    }
    return l;
  }

  /** keeps the focused body's rotating globe current; false = no map yet */
  function updateGlobe(b: BodyState, lx: number, ly: number): boolean {
    if (!maps) return false;
    const st = b.style;
    const base = maps.get(st.map);
    const clouds = st.clouds ? maps.get(st.clouds) : null;
    if (!base || (st.clouds && !clouds)) {
      maps.want(st.map);
      if (st.clouds) maps.want(st.clouds);
      return false;
    }
    const D = clamp(Math.ceil((b.rs * 2 * dpr) / 32) * 32, 32, maxD);
    let g = b.globe;
    if (!g || g.D !== D) {
      const c = document.createElement("canvas");
      c.width = c.height = D;
      const o = c.getContext("2d");
      if (!o) return false;
      g = {
        canvas: c,
        ctx: o,
        img: o.createImageData(D, D),
        D,
        shift: NaN,
        cshift: NaN,
        lx: NaN,
        ly: NaN,
        at: -1,
        ready: false,
      };
      b.globe = g;
    }
    const shift = time / st.spin;
    const cshift = st.cloudSpin ? time / st.cloudSpin : 0;
    // light in the globe's own frame (the globe is drawn turned by rho)
    const c = Math.cos(b.rho);
    const s = Math.sin(b.rho);
    const gx = lx * c + ly * s;
    const gy = -(-lx * s + ly * c);
    const animated = !!(st.bands || st.vortex || b.effect?.dustFront);
    const due =
      !g.ready ||
      Math.abs(shift - g.shift) * base.w >= 0.33 ||
      Math.abs(cshift - g.cshift) * base.w >= 0.33 ||
      Math.abs(gx - g.lx) + Math.abs(gy - g.ly) > 0.02 ||
      (animated && time - g.at >= 0.05);
    if (!due) return true;
    if (st.bands) {
      if (!b.bands) b.bands = new Float32Array(MAP_ROWS);
      for (let j = 0; j < MAP_ROWS; j++) {
        const lat = (0.5 - (j + 0.5) / MAP_ROWS) * Math.PI;
        const v = st.bands(lat) * time;
        b.bands[j] = v - Math.floor(v);
      }
    }
    let vortex: GlobeStyle["vortex"] = null;
    if (st.vortex) {
      const T = 4;
      const p1 = (time / T) % 1;
      const p2 = (p1 + 0.5) % 1;
      vortex = {
        x: st.vortex.x,
        y: st.vortex.y,
        rx: st.vortex.rx,
        ry: st.vortex.ry,
        a1: st.vortex.rate * T * p1,
        a2: st.vortex.rate * T * p2,
        blend: Math.abs(2 * p1 - 1),
      };
    }
    let dust: GlobeStyle["dust"] = null;
    const df = b.effect?.dustFront?.();
    if (df) {
      let at = df.at * 0.25 + 0.5 - shift;
      at -= Math.floor(at);
      dust = { at, width: 0.07, amount: df.amount };
    }
    const L = Math.hypot(gx, gy) || 1;
    renderGlobe(
      g.img,
      lutFor(D),
      { map: base, shift, bands: b.bands },
      clouds ? { map: clouds, shift: cshift } : null,
      {
        kind: st.kind,
        ambient: st.ambient,
        limb: st.limb,
        specular: st.specular ?? 0,
        cloudOpacity: st.cloudOpacity ?? 1,
        vortex,
        dust,
      },
      { x: (gx / L) * 0.88, y: (gy / L) * 0.88, z: 0.475 }
    );
    g.ctx.putImageData(g.img, 0, 0);
    g.shift = shift;
    g.cshift = cshift;
    g.lx = gx;
    g.ly = gy;
    g.at = time;
    g.ready = true;
    return true;
  }

  /** where a vortex sits on the visible hemisphere, for the effects */
  function spotOf(b: BodyState): EffectEnv["spot"] {
    const v = b.style.vortex;
    if (!v) return null;
    const row = clamp(Math.floor(v.y * MAP_ROWS), 0, MAP_ROWS - 1);
    let lon = v.x - 0.5 + time / b.style.spin + (b.bands ? b.bands[row] : 0);
    lon -= Math.round(lon);
    return { lam: lon * TAU, phi: (0.5 - v.y) * Math.PI };
  }

  const env: EffectEnv = {
    x: 0,
    y: 0,
    r: 1,
    rho: 0,
    flat: 1,
    lx: 0,
    ly: 0,
    amount: 0,
    t: 0,
    dt: 0,
    spot: null,
  };

  function fillEnv(b: BodyState, lx: number, ly: number, dt: number) {
    env.x = b.x;
    env.y = b.y;
    env.r = b.rs;
    env.rho = b.rho;
    env.flat = b.data.planeFlatten;
    env.lx = lx;
    env.ly = ly;
    env.amount = b.focus;
    env.t = time;
    env.dt = dt;
    env.spot = spotOf(b);
  }

  function lightOf(b: BodyState) {
    const sx = sun.x - b.x;
    const sy = sun.y - b.y;
    const len = Math.hypot(sx, sy) || 1;
    return [sx / len, sy / len] as const;
  }

  let glowSprite: HTMLCanvasElement | null = null;
  /** the Sun's glow, drawn once and scaled */
  function sunGlow() {
    if (glowSprite) return glowSprite;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const o = c.getContext("2d");
    if (o) {
      const g = o.createRadialGradient(
        128,
        128,
        128 * (0.55 / 2.85),
        128,
        128,
        128
      );
      g.addColorStop(0, "rgba(255,188,92,0.46)");
      g.addColorStop(0.3, "rgba(255,136,48,0.15)");
      g.addColorStop(1, "rgba(255,110,30,0)");
      o.fillStyle = g;
      o.fillRect(0, 0, 256, 256);
    }
    glowSprite = c;
    return c;
  }

  function drawSun(b: BodyState) {
    const a = b.focus;
    const r = b.rs;
    const breath = opts.reducedMotion ? 1 : 1 + 0.03 * Math.sin(time * 0.6);
    const outer = r * (2.6 + 0.5 * a) * breath;
    ctx.globalAlpha = 0.74 + 0.26 * a;
    ctx.drawImage(sunGlow(), b.x - outer, b.y - outer, outer * 2, outer * 2);
    ctx.globalAlpha = 1;
    if (a > 0.01 && b.effect) {
      fillEnv(b, 0, 0, 0);
      b.effect.back(ctx, env);
      flushParticles(ctx);
    }
    const g = b.globe;
    if (a > 0.02 && g && g.ready) {
      ctx.drawImage(g.canvas, b.x - r, b.y - r, r * 2, r * 2);
    } else {
      // two granulation layers cross-fading: slow, subtle surface movement
      ctx.drawImage(sunSprites[0], b.x - r, b.y - r, r * 2, r * 2);
      ctx.globalAlpha = opts.reducedMotion
        ? 0.5
        : 0.5 + 0.5 * Math.sin(time * 0.45);
      ctx.drawImage(sunSprites[1], b.x - r, b.y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    if (a < 0.99) {
      // something else has the focus: the Sun steps back a little
      ctx.fillStyle = `rgba(8,8,8,${(0.18 * (1 - a)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + 0.5, 0, TAU);
      ctx.fill();
    }
    if (a > 0.01 && b.effect) {
      fillEnv(b, 0, 0, 0);
      b.effect.front(ctx, env);
      flushParticles(ctx);
    }
  }

  function drawBody(b: BodyState) {
    if (b.index === 0) return drawSun(b);
    const a = b.focus;
    const dim = dimOf(b);
    const r = b.rs * (1 + 0.1 * b.depth * (1 - a));
    const [lx, ly] = lightOf(b);
    const moonAlpha = 0.34 * dim + (0.85 - 0.34 * dim) * a;
    const orbitAlpha = 0.035 * dim + 0.15 * a;
    if (a > 0.02) {
      const halo = ctx.createRadialGradient(
        b.x,
        b.y,
        r * 0.9,
        b.x,
        b.y,
        r * 2.4
      );
      halo.addColorStop(0, rgba(b.color, 0.07 * a));
      halo.addColorStop(1, rgba(b.color, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 2.4, 0, TAU);
      ctx.fill();
    }
    if (a > 0.01 && b.effect) fillEnv(b, lx, ly, 0);
    drawMoonOrbits(b, false, orbitAlpha);
    for (const m of b.moons)
      if (m.depth < 0) drawMoon(m, b, lx, ly, moonAlpha * 0.85, a > 0.3);
    drawRings(b, r, false, dim);
    if (a > 0.01 && b.effect) {
      b.effect.back(ctx, env);
      flushParticles(ctx);
    }
    const g = b.globe;
    if (a > 0.02 && g && g.ready) {
      if (b.rho) {
        const c = Math.cos(b.rho) * dpr;
        const sn = Math.sin(b.rho) * dpr;
        ctx.setTransform(c, sn, -sn, c, b.x * dpr, b.y * dpr);
        ctx.drawImage(g.canvas, -r, -r, r * 2, r * 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.drawImage(g.canvas, b.x - r, b.y - r, r * 2, r * 2);
      }
      if (dim < 1) {
        ctx.fillStyle = `rgba(8,8,8,${(1 - dim).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + 0.3, 0, TAU);
        ctx.fill();
      }
    } else {
      drawSprite(b, r, lx, ly, Math.min(1, dim));
    }
    if (b.atmoSprite) {
      ctx.globalAlpha = Math.min(1, dim) * (1 - 0.5 * a);
      ctx.drawImage(
        b.atmoSprite,
        b.x - r * 1.3,
        b.y - r * 1.3,
        r * 2.6,
        r * 2.6
      );
      ctx.globalAlpha = 1;
    }
    drawRings(b, r, true, dim);
    if (a > 0.01 && b.effect) {
      b.effect.front(ctx, env);
      flushParticles(ctx);
    }
    drawMoonOrbits(b, true, orbitAlpha);
    for (const m of b.moons)
      if (m.depth >= 0) drawMoon(m, b, lx, ly, moonAlpha, a > 0.3);
  }

  function labelImage(index: number, fs: number) {
    const color = bodies[index].color;
    const key = `${index}|${color.join(",")}|${fs}|${W}|${dpr}`;
    const hit = labels.get(key);
    if (hit) return hit;
    const font = `600 ${fs}px ${opts.fontFamily || "sans-serif"}`;
    const spacing = `${(fs * 0.12).toFixed(2)}px`;
    ctx.font = font;
    ctx.letterSpacing = spacing;
    const num = String(index + 1).padStart(2, "0");
    const wNum = ctx.measureText(num).width;
    let rest = ` — ${bodies[index].data.name.toUpperCase()}`;
    let w = wNum + ctx.measureText(rest).width;
    if (w > W - 8) {
      rest = "";
      w = wNum;
    }
    ctx.letterSpacing = "0px";
    const h = Math.ceil(fs * 1.6);
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * dpr) + 2;
    c.height = Math.ceil(h * dpr);
    const o = c.getContext("2d");
    if (o) {
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.font = font;
      o.letterSpacing = spacing;
      o.textBaseline = "middle";
      o.fillStyle = rgba(color, 0.95);
      o.fillText(num, 0, h / 2);
      if (rest) {
        o.fillStyle = "rgba(239,239,239,0.78)";
        o.fillText(rest, wNum, h / 2);
      }
    }
    const out = { canvas: c, w: c.width / dpr, h };
    labels.set(key, out);
    return out;
  }

  /** "04 — EARTH" for the focused body, cross-fading through transitions */
  function drawLabels() {
    const fs = W < 120 ? 9 : 10.5;
    for (const b of bodies) {
      if (!mapped(b.index) || b.focus < 0.05) continue;
      const alpha = smooth(0.3, 0.95, b.focus);
      if (alpha <= 0.01) continue;
      const l = labelImage(b.index, fs);
      let x: number;
      let y: number;
      if (vertical) {
        x = clamp(b.x - l.w / 2, 4, Math.max(4, W - l.w - 4));
        y = clamp(b.y + b.rs * Math.min(b.extY, 1.75) + 12, 4, H - l.h - 6);
      } else {
        x = 10;
        y = 8;
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(l.canvas, x, y, l.w, l.h);
      ctx.globalAlpha = 1;
    }
  }

  /** soft edge where the canvas meets the page, so nothing ends in a hard line */
  function edgeFade() {
    if (!fade) {
      if (vertical) {
        const w = Math.min(56, W * 0.18);
        fade = ctx.createLinearGradient(W - w, 0, W, 0);
      } else {
        fade = ctx.createLinearGradient(0, H - 26, 0, H);
        // the band starts at the very top of the screen: anything reaching
        // it (the corona, a moon, a ring tip) dissolves instead of being cut
        fadeTop = ctx.createLinearGradient(0, TOP_FADE, 0, 0);
        fadeTop.addColorStop(0, "rgba(0,0,0,0)");
        fadeTop.addColorStop(1, "rgba(0,0,0,1)");
      }
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
    }
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = fade;
    if (vertical) {
      const w = Math.min(56, W * 0.18);
      ctx.fillRect(W - w, 0, w, H);
    } else {
      ctx.fillRect(0, H - 26, W, 26);
      if (fadeTop) {
        ctx.fillStyle = fadeTop;
        ctx.fillRect(0, 0, W, TOP_FADE);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // stars drift a little against the camera, for depth
    const px = clamp(-(camX - cx) * camZ * 0.08, -starPad, starPad);
    const py = clamp(-(camY - cy) * camZ * 0.08, -starPad, starPad);
    drawStars(px, py);
    // depth order of the planets (in place: no allocation per frame)
    for (let i = 1; i < order.length; i++) {
      const v = order[i];
      let j = i - 1;
      while (j >= 0 && bodies[order[j]].depth > bodies[v].depth) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = v;
    }
    drawOrbits(false);
    for (let i = 0; i < order.length; i++) {
      const b = bodies[order[i]];
      if (b.depth < 0 && b.focus < 0.001) drawBody(b);
    }
    // the Sun keeps its place in depth even in focus: planets on the near
    // side of their orbits still cross in front of it
    drawBody(sun);
    drawOrbits(true);
    for (let i = 0; i < order.length; i++) {
      const b = bodies[order[i]];
      if (b.depth >= 0 && b.focus < 0.001) drawBody(b);
    }
    // a focused planet is the nearest thing to the camera: drawn last,
    // weakest first
    let first: BodyState | null = null;
    let second: BodyState | null = null;
    for (const b of bodies) {
      if (b.index === 0 || b.focus < 0.001) continue;
      if (!first || b.focus > first.focus) {
        second = first;
        first = b;
      } else second = b;
    }
    if (second) drawBody(second);
    if (first) drawBody(first);
    edgeFade();
    // after the fade, so the label at the band's top edge stays crisp
    drawLabels();
  }

  function step(dt: number) {
    const target = opts.progress ? opts.progress() : active;
    if (opts.reducedMotion || dt <= 0) sNow = target;
    else {
      sNow += (target - sNow) * (1 - Math.exp(-dt / DAMP));
      if (Math.abs(target - sNow) < 1e-4) sNow = target;
    }
    place(time);
    focusCamera();
    project();
    for (const b of bodies) {
      if (b.focus <= 0.005) continue;
      if (!b.effect && !opts.reducedMotion)
        b.effect = createEffect(b.data.id, budget, b.data.rings ?? undefined);
      const [lx, ly] = lightOf(b);
      if (b.effect && dt > 0) {
        fillEnv(b, lx, ly, dt);
        b.effect.update(env);
      }
      if (b.focus > 0.02 && b.rs >= 5) updateGlobe(b, lx, ly);
    }
  }

  function frame(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!last) {
      last = now;
      return;
    }
    let dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    // 60fps is plenty for this motion (high-refresh screens would otherwise
    // draw it twice as often); phones run at 30
    acc += dt;
    const minStep = opts.lowPower ? 1 / 30 : 1 / 62;
    if (acc < minStep) return;
    dt = Math.min(0.1, acc);
    acc = 0;
    time += dt;
    step(dt);
    draw();
  }

  function renderStatic() {
    step(0);
    draw();
  }

  return {
    resize(width, height) {
      if (width < 2 || height < 2) return;
      W = width;
      H = height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      layout();
      ensureSprites();
      labels.clear();
      for (const b of bodies) b.globe = null;
      renderStatic();
      warmUp();
    },
    setActive(index, color) {
      active = mapped(index) ? index : 0;
      accent = parseColor(color, accent);
      if (!opts.colors) setColors();
      if (!running) renderStatic();
    },
    start() {
      if (running || opts.reducedMotion) return;
      // back on screen: show where the page is now, no fly-through
      sNow = opts.progress ? opts.progress() : active;
      running = true;
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    renderOnce() {
      renderStatic();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      cancelWarm();
      maps?.destroy();
      luts.clear();
      labels.clear();
      sunSprites = [];
      for (const b of bodies) {
        b.sprite = null;
        b.atmoSprite = null;
        b.globe = null;
        b.effect = null;
      }
      canvas.width = 0;
      canvas.height = 0;
    },
    snapshot() {
      return {
        mode: vertical ? "vertical" : "horizontal",
        width: W,
        height: H,
        time,
        s: sNow,
        active,
        k,
        camera: { x: camX, y: camY, z: camZ, fx, fy },
        bodies: bodies.map((b) => ({
          id: b.data.id,
          wx: b.wx,
          wy: b.wy,
          x: b.x,
          y: b.y,
          rs: b.rs,
          r: b.r,
          R: b.R,
          theta: b.theta,
          depth: b.depth,
          scale: b.mag,
          focus: b.focus,
          globe: !!b.globe?.ready && b.focus > 0.02,
          particles: b.effect && b.focus > 0.005 ? b.effect.live() : 0,
        })),
        moons: bodies.flatMap((b) =>
          b.moons.map((m) => ({
            id: m.data.id,
            parent: b.data.id,
            x: m.x,
            y: m.y,
            a: m.a * camZ * b.mag * (1 + (m.fit - 1) * b.focus),
            rho: m.rho,
            f: m.f,
          }))
        ),
        maps: maps?.ready() ?? 0,
      };
    },
  };
}
