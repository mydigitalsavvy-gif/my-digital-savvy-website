import { BODIES, type BodyData, type MoonData } from "./data";
import { FOCUS, type FocusStyle } from "./focus";
import { makeLut, renderGlobe, type GlobeLut, type GlobeStyle } from "./globe";
import { createMapStore, type MapStore } from "./maps";
import { mulberry32, renderSphere, type MapId } from "./textures";

/**
 * Canvas 2D renderer for the portfolio solar system, the homepage section
 * that replaced Selected Work. Unlike the services system (engine.ts) it
 * doesn't follow the scroll: it is a live orrery that runs on its own.
 *
 * Time. The planets start where they really are on the day (heliocentric
 * longitudes from J2000 mean elements plus the equation of the centre,
 * good to a degree or two), then run as a brisk time-lapse: Earth goes
 * round in 7.5 seconds and the others keep the real order of periods
 * (data.ts). Moons circle their own planets at the services view's pace
 * (a faster lapse made the inner ones flicker); Triton goes backwards.
 *
 * View. The orbital plane is seen from above at an angle, every orbit with
 * the same foreshortening `k`; bodies are drawn far to near with the Sun
 * in between, each lit from the Sun's side, and everything turns
 * counter-clockwise as seen from the north. A fine pointer tilts and rolls
 * the plane a little. Hovering a body slows time right down, brings that
 * body forward (it grows, its moons' orbits show, it turns as a real globe
 * once its map is ready) and names it. Clicks belong to the page: the
 * canvas sits inside a link.
 *
 * Nothing here touches React or the page's CSS; the only output is pixels.
 */

export type OrreryOptions = {
  reducedMotion: boolean;
  /** phones: 30fps, fewer moons, stars and rocks; no hover */
  lowPower: boolean;
  /** the site's resolved font family, for the labels */
  fontFamily: string;
  /** highlight colour (hover ring, orbit, label mark) */
  highlight: string;
  /** the day the planets start from (default: now) */
  date?: Date;
};

export type OrrerySnapshot = {
  width: number;
  height: number;
  /** orbital (time-lapse) seconds since the start, and its current rate */
  time: number;
  speed: number;
  k: number;
  roll: number;
  hovered: string | null;
  frames: number;
  sprites: number;
  maps: number;
  bodies: {
    id: string;
    x: number;
    y: number;
    rs: number;
    R: number;
    theta: number;
    depth: number;
    hover: number;
    globe: boolean;
  }[];
  moons: {
    id: string;
    parent: string;
    x: number;
    y: number;
    rs: number;
    depth: number;
  }[];
};

export type Orrery = {
  resize(width: number, height: number): void;
  /** pointer position in CSS px over the canvas; null when it leaves */
  pointer(x: number | null, y: number | null): void;
  start(): void;
  stop(): void;
  renderOnce(): void;
  destroy(): void;
  snapshot(): OrrerySnapshot;
};

type RGB = [number, number, number];

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

type MoonState = {
  data: MoonData;
  /** base radius, px */
  r: number;
  rho: number;
  f: number;
  x: number;
  y: number;
  rs: number;
  depth: number;
};

type BodyState = {
  data: BodyData;
  index: number;
  style: FocusStyle;
  /** base radius and orbit radius, px */
  r: number;
  R: number;
  /** longitude on the start day, radians */
  theta0: number;
  /** seconds per orbit in the time-lapse */
  period: number;
  theta: number;
  x: number;
  y: number;
  /** -1 far side of the orbit … 1 near side */
  depth: number;
  /** drawn radius this frame */
  rs: number;
  /** 0..1, eased in and out */
  hover: number;
  rho: number;
  moons: MoonState[];
  fallback: string;
  sprite: HTMLCanvasElement | null;
  spriteSize: number;
  atmosphere: { color: RGB; alpha: number } | null;
  atmoSprite: HTMLCanvasElement | null;
  ringColor: RGB;
  globe: GlobeState | null;
  bands: Float32Array | null;
};

type Star = { x: number; y: number; r: number; level: number };
type Rock = { R: number; a0: number; w: number; s: number; bright: boolean };
type Target = { body: BodyState; moon: MoonState | null };

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** time-lapse: data.ts periods (Earth 30s) run this much faster (Earth 7.5s) */
const LAPSE = 4;
/** moons: their data.ts periods run this much faster */
const MOON_LAPSE = 2.5;
/**
 * how slow time runs while a body is hovered: almost stopped, so even
 * Mercury and Earth stay under the pointer long enough to be read and
 * clicked at the brisk lapse
 */
const HOVER_SPEED = 0.04;
/** a hovered body grows by this fraction */
const HOVER_GROW = 0.75;
/** the Sun grows less: it is already large */
const SUN_GROW = 0.18;
/** pointer response: plane opening (fraction of k) and roll */
const TILT = 0.1;
const ROLL = 4 * DEG;
/** a hovered globe turns this much faster than in the services view */
const SPIN = 2;
const MAP_ROWS = 128;
/** Saturn-style ring bands: [from, to, opacity] as fractions of ring width */
const SATURN_RINGS: [number, number, number][] = [
  [0, 0.29, 0.22],
  [0.29, 0.73, 0.95],
  [0.79, 1, 0.62],
];
const SINGLE_RING: [number, number, number][] = [[0, 1, 1]];
/** flat colours for the moment before a body's sprite exists */
const FALLBACK: Record<string, string> = {
  sun: "#ffb347",
  mercury: "#8f847a",
  venus: "#dcc08c",
  earth: "#3c6fae",
  mars: "#b7653f",
  jupiter: "#cfae88",
  saturn: "#d9c595",
  uranus: "#9fd3db",
  neptune: "#4766c8",
};

/**
 * J2000 mean elements (JPL, Standish 1992): mean longitude and its rate
 * (degrees, degrees per century), eccentricity, longitude of perihelion.
 */
const ELEMENTS: Record<string, [number, number, number, number]> = {
  mercury: [252.2503235, 149472.67411175, 0.20563593, 77.45779628],
  venus: [181.9790995, 58517.81538729, 0.00677672, 131.60246718],
  earth: [100.46457166, 35999.37244981, 0.01671123, 102.93768193],
  mars: [-4.55343205, 19140.30268499, 0.0933941, -23.94362959],
  jupiter: [34.39644051, 3034.74612775, 0.04838624, 14.72847983],
  saturn: [49.95424423, 1222.49362201, 0.05386179, 92.59887831],
  uranus: [313.23810451, 428.48202785, 0.04725744, 170.9542763],
  neptune: [-55.12002969, 218.45945325, 0.00859048, 44.96476227],
};

/** heliocentric ecliptic longitude of a planet on a date, radians */
export function longitude(id: string, date: Date) {
  const el = ELEMENTS[id];
  if (!el) return 0;
  // Julian centuries since J2000.0
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;
  const L = (el[0] + el[1] * T) * DEG;
  const M = L - el[3] * DEG;
  const e = el[2];
  // mean → true anomaly (equation of the centre, two terms)
  const v = L + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
  return v - TAU * Math.floor(v / TAU);
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);

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

/** a soft rim glow for planets with atmospheres, drawn once per size */
function renderAtmosphere(
  atmo: { color: RGB; alpha: number },
  planetSize: number
) {
  const c = document.createElement("canvas");
  const D = Math.max(8, Math.round(planetSize * 1.3));
  c.width = D;
  c.height = D;
  const o = c.getContext("2d");
  if (!o) return c;
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

const NOOP: Orrery = {
  resize() {},
  pointer() {},
  start() {},
  stop() {},
  renderOnce() {},
  destroy() {},
  snapshot: () => ({
    width: 0,
    height: 0,
    time: 0,
    speed: 0,
    k: 0,
    roll: 0,
    hovered: null,
    frames: 0,
    sprites: 0,
    maps: 0,
    bodies: [],
    moons: [],
  }),
};

export function createOrrery(
  canvas: HTMLCanvasElement,
  opts: OrreryOptions
): Orrery {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return NOOP;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let W = 1;
  let H = 1;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let k0 = 0.4;
  let k = 0.4;
  let roll = 0;
  let time = 0;
  let clock = 0;
  let speed = 1;
  let last = 0;
  let acc = 0;
  let raf = 0;
  let running = false;
  let frames = 0;
  let stars: Star[] = [];
  let rocks: Rock[] = [];
  let sunSprites: HTMLCanvasElement[] = [];
  let sunSpriteSize = 0;
  let glowSprite: HTMLCanvasElement | null = null;
  // pointer (CSS px over the canvas; NaN = none) and its eased tilt
  let px = NaN;
  let py = NaN;
  let tiltX = 0;
  let tiltY = 0;
  let target: Target | null = null;
  // sprites are built in idle time, largest first, never mid-frame
  let spriteQueue: (() => void)[] = [];
  let spriteId = 0;
  let maps: MapStore | null = null;
  const luts = new Map<number, GlobeLut>();
  const hoverable = !opts.reducedMotion && !opts.lowPower;
  const grow = opts.reducedMotion ? 0 : HOVER_GROW;
  const highlight = parseColor(opts.highlight, [1, 254, 251]);
  const day = opts.date ?? new Date();
  const order = new Int8Array(BODIES.length - 1);
  for (let i = 0; i < order.length; i++) order[i] = i + 1;

  const bodies: BodyState[] = BODIES.map((data, index) => ({
    data,
    index,
    style: FOCUS[data.id],
    r: 1,
    R: 0,
    theta0: index === 0 ? 0 : longitude(data.id, day),
    period: data.period / LAPSE,
    theta: 0,
    x: 0,
    y: 0,
    depth: 0,
    rs: 1,
    hover: 0,
    rho: data.planeTilt * DEG,
    moons: [],
    fallback: FALLBACK[data.id] ?? "#888888",
    sprite: null,
    spriteSize: 0,
    atmosphere: data.atmosphere
      ? {
          color: parseColor(data.atmosphere, [255, 255, 255]),
          alpha: parseAlpha(data.atmosphere),
        }
      : null,
    atmoSprite: null,
    ringColor: parseColor(data.rings?.color ?? "#ffffff", [255, 255, 255]),
    globe: null,
    bands: null,
  }));
  const sun = bodies[0];
  // the same seeds as the services view, so every body looks the same there
  const seedOf = (i: number) => (i === 0 ? 11 : 101 + i * 17);

  /** largest extent of a planet's own system (body, rings, moons), px */
  function systemHalf(b: BodyState) {
    let ext = b.r * 1.3;
    if (b.data.rings) ext = Math.max(ext, b.data.rings.outer * b.r);
    for (const m of b.moons)
      ext = Math.max(ext, m.data.orbitRadius * b.r + m.r);
    return ext;
  }

  function layout() {
    const minor = Math.min(W, H);
    const sunR = clamp(minor * (opts.lowPower ? 0.068 : 0.058), 12, 36);
    const unit = sunR / BODIES[0].size;
    for (const b of bodies) {
      b.r =
        b.index === 0
          ? sunR
          : Math.max(opts.lowPower ? 1.8 : 2.2, unit * b.data.size);
      const list = opts.lowPower
        ? b.data.moons.filter((m) => m.essential)
        : b.data.moons;
      b.moons = list.map((m) => ({
        data: m,
        r: Math.max(0.7, unit * m.size),
        rho: b.rho + m.inclination * DEG,
        f: clamp(b.data.planeFlatten * (1 + m.inclination / 60), 0.12, 0.95),
        x: 0,
        y: 0,
        rs: 0,
        depth: 0,
      }));
    }
    // orbits: the real order, spaced as in the services view (data.ts),
    // from just outside the Sun's glow to the edge of the box, leaving the
    // outer planet room to grow on hover
    const outer = bodies[bodies.length - 1];
    const edge = systemHalf(outer) * (hoverable ? 1 + grow * 0.6 : 1) + 8;
    const rMax = Math.max(60, W / 2 - edge);
    const rMin = sunR * 1.5 + systemHalf(bodies[1]) + 6;
    const span = Math.max(8, rMax - rMin);
    for (const b of bodies) if (b.index > 0) b.R = rMin + span * b.data.orbit;
    cx = W / 2;
    cy = H / 2;
    // as open as the box allows (a little kept back for the pointer tilt),
    // never edge-on and never flat
    k0 = clamp((H / 2 - edge) / rMax / (1 + TILT), 0.3, 0.86);
    k = k0;

    const rand = mulberry32(2026);
    const n = Math.round(
      clamp((W * H) / (opts.lowPower ? 4200 : 5200), 24, 170)
    );
    stars = Array.from({ length: n }, () => ({
      x: rand() * (W + 24) - 12,
      y: rand() * (H + 24) - 12,
      r: 0.45 + rand() * 0.75,
      level: rand() < 0.55 ? 0 : rand() < 0.7 ? 1 : 2,
    }));
    // the asteroid belt between Mars and Jupiter: inner rocks go faster
    const mars = bodies[4];
    const jupiter = bodies[5];
    const count = opts.lowPower ? 70 : 150;
    rocks = Array.from({ length: count }, () => {
      const u = 0.28 + rand() * 0.44;
      const R = mars.R + (jupiter.R - mars.R) * u;
      const P = mars.period * Math.pow(R / mars.R, 1.5);
      return {
        R,
        a0: rand() * TAU,
        w: TAU / P,
        s: 0.6 + rand() * 0.7,
        bright: rand() < 0.3,
      };
    });
  }

  /* ── sprites, in idle time ────────────────────────────────────────── */

  function idle(fn: () => void) {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    spriteId = w.requestIdleCallback
      ? w.requestIdleCallback(fn, { timeout: 300 })
      : window.setTimeout(fn, 16);
  }

  function cancelSprites() {
    spriteQueue = [];
    if (!spriteId) return;
    const w = window as Window & { cancelIdleCallback?: (id: number) => void };
    if (w.cancelIdleCallback) w.cancelIdleCallback(spriteId);
    else window.clearTimeout(spriteId);
    spriteId = 0;
  }

  /** queues every sprite whose size no longer fits, the Sun first */
  function queueSprites() {
    cancelSprites();
    const g = hoverable ? 1 + grow : 1;
    const wantSun = Math.ceil(sun.r * 2 * (hoverable ? 1 + SUN_GROW : 1) * dpr);
    if (
      !sunSprites.length ||
      wantSun > sunSpriteSize * 1.15 ||
      wantSun < sunSpriteSize * 0.6
    ) {
      const D = clamp(wantSun, 12, 220);
      spriteQueue.push(() => {
        const a = renderSphere("sun", D, 11);
        const b = renderSphere("sun", D, 12, 0.6);
        sunSprites = [a, b];
        sunSpriteSize = D;
      });
    }
    const planets = bodies.slice(1).sort((a, b) => b.data.size - a.data.size);
    for (const b of planets) {
      // sized for the hovered (largest) view, so growing stays sharp
      const want = Math.ceil(b.r * 2 * g * 1.12 * dpr);
      if (b.sprite && want <= b.spriteSize * 1.15 && want >= b.spriteSize * 0.6)
        continue;
      const D = clamp(want, 6, 180);
      spriteQueue.push(() => {
        b.sprite = renderSphere(b.data.surface, D, seedOf(b.index), 0.3);
        b.spriteSize = D;
        b.atmoSprite = b.atmosphere ? renderAtmosphere(b.atmosphere, D) : null;
      });
    }
    const next = () => {
      spriteId = 0;
      const job = spriteQueue.shift();
      if (!job) return;
      job();
      // not animating (off screen, reduced motion): show the new sprite
      if (!running) draw();
      if (spriteQueue.length) idle(next);
    };
    if (spriteQueue.length) idle(next);
  }

  function sunGlow() {
    if (glowSprite) return glowSprite;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const o = c.getContext("2d");
    if (o) {
      const g = o.createRadialGradient(128, 128, 128 * 0.2, 128, 128, 128);
      g.addColorStop(0, "rgba(255,188,92,0.5)");
      g.addColorStop(0.3, "rgba(255,136,48,0.16)");
      g.addColorStop(1, "rgba(255,110,30,0)");
      o.fillStyle = g;
      o.fillRect(0, 0, 256, 256);
    }
    glowSprite = c;
    return c;
  }

  /* ── motion ───────────────────────────────────────────────────────── */

  /** orbital positions on the tilted, rolled plane, and drawn sizes */
  function place() {
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    // how much nearer the near side of an orbit is than the far side
    const depthScale = 0.1 * Math.sqrt(Math.max(0, 1 - k * k));
    sun.x = cx;
    sun.y = cy;
    sun.depth = 0;
    sun.rs = sun.r * (1 + SUN_GROW * ease(sun.hover) * (grow ? 1 : 0));
    for (const b of bodies) {
      if (b.index === 0) continue;
      const th = b.theta0 + (TAU * time) / b.period;
      b.theta = th;
      // longitude 90° is the far side (up), 270° the near side (down)
      const X = b.R * Math.cos(th);
      const Y = -k * b.R * Math.sin(th);
      b.x = cx + X * cr - Y * sr;
      b.y = cy + X * sr + Y * cr;
      b.depth = -Math.sin(th);
      b.rs = b.r * (1 + depthScale * b.depth) * (1 + grow * ease(b.hover));
      const s = b.rs / b.r;
      for (const m of b.moons) {
        const ph =
          m.data.phase +
          (m.data.direction * TAU * time * MOON_LAPSE) / m.data.period;
        const a = m.data.orbitRadius * b.rs;
        const lx = a * Math.cos(ph);
        const ly = -a * m.f * Math.sin(ph);
        const rho = m.rho + roll;
        const c = Math.cos(rho);
        const sn = Math.sin(rho);
        m.x = b.x + lx * c - ly * sn;
        m.y = b.y + lx * sn + ly * c;
        m.rs = m.r * s;
        m.depth = -Math.sin(ph);
      }
    }
  }

  /** the body (or moon) under the pointer, nearest the viewer on a tie */
  function pick(): Target | null {
    if (Number.isNaN(px)) return null;
    let best: Target | null = null;
    let bestScore = Infinity;
    let keep = Infinity;
    const consider = (
      body: BodyState,
      moon: MoonState | null,
      x: number,
      y: number,
      hit: number,
      depth: number
    ) => {
      const d = Math.hypot(px - x, py - y);
      // the current target holds on a little longer (no flicker between
      // neighbours, and a body drifting from under a still pointer stays
      // named for a moment)
      if (target && target.body === body && target.moon === moon)
        keep = d / (hit * 1.8);
      if (d > hit) return;
      const score = d / hit - depth * 0.04;
      if (score < bestScore) {
        bestScore = score;
        best = { body, moon };
      }
    };
    for (const b of bodies) {
      for (const m of b.moons)
        consider(b, m, m.x, m.y, Math.max(7, m.rs + 4), b.depth + 0.01);
      const hit =
        b.index === 0
          ? b.rs * 1.1 + 4
          : Math.max(12, b.rs * (b.data.rings ? 1.9 : 1.25) + 4);
      consider(b, null, b.x, b.y, hit, b.depth);
    }
    if (target && keep <= 1 && bestScore > 0.35) return target;
    return best;
  }

  function step(dt: number) {
    const a = dt > 0 ? 1 - Math.exp(-dt / 0.14) : 1;
    const slow = dt > 0 ? 1 - Math.exp(-dt / 0.3) : 1;
    // time brakes hard as a body is hovered (at full lapse an inner planet
    // would leave the pointer within a few frames) and picks up gently
    const brake = dt > 0 ? 1 - Math.exp(-dt / 0.05) : 1;
    const lazy = dt > 0 ? 1 - Math.exp(-dt / 0.45) : 1;
    if (hoverable) {
      const tx = Number.isNaN(px) ? 0 : clamp((px - W / 2) / (W / 2), -1, 1);
      const ty = Number.isNaN(py) ? 0 : clamp((py - H / 2) / (H / 2), -1, 1);
      tiltX += (tx - tiltX) * lazy;
      tiltY += (ty - tiltY) * lazy;
      roll = -tiltX * ROLL;
      k = k0 * (1 + TILT * tiltY);
    }
    target = pick();
    for (const b of bodies) {
      const want = target && target.body === b ? 1 : 0;
      b.hover += (want - b.hover) * (opts.reducedMotion ? 1 : a);
      if (Math.abs(want - b.hover) < 1e-3) b.hover = want;
    }
    if (!opts.reducedMotion) {
      const want = target ? HOVER_SPEED : 1;
      speed += (want - speed) * (want < speed ? brake : slow);
      time += dt * speed;
      clock += dt;
    }
    place();
  }

  /* ── globes (hovered body only) ───────────────────────────────────── */

  function ensureMaps(first: BodyState) {
    if (maps || !hoverable) return;
    const jobs: { id: MapId; seed: number }[] = [];
    const list = [first, ...bodies.filter((b) => b !== first)];
    for (const b of list) {
      jobs.push({ id: b.style.map, seed: seedOf(b.index) });
      if (b.style.clouds && b.style.clouds !== b.style.map)
        jobs.push({ id: b.style.clouds, seed: seedOf(b.index) });
    }
    maps = createMapStore(jobs);
  }

  function lutFor(D: number) {
    let l = luts.get(D);
    if (!l) {
      l = makeLut(D);
      luts.set(D, l);
    }
    return l;
  }

  /** the hovered body's rotating globe, kept current; null = no map yet */
  function updateGlobe(b: BodyState, lx: number, ly: number) {
    ensureMaps(b);
    if (!maps) return null;
    const st = b.style;
    const base = maps.get(st.map);
    const clouds = st.clouds ? maps.get(st.clouds) : null;
    if (!base || (st.clouds && !clouds)) {
      maps.want(st.map);
      if (st.clouds) maps.want(st.clouds);
      return null;
    }
    // one size per body: its fully hovered size
    const full = b.r * (1 + (b.index === 0 ? SUN_GROW : grow)) * 1.12;
    const D = clamp(Math.ceil((full * 2 * dpr) / 16) * 16, 32, 192);
    let g = b.globe;
    if (!g || g.D !== D) {
      const c = document.createElement("canvas");
      c.width = c.height = D;
      const o = c.getContext("2d");
      if (!o) return null;
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
    const shift = (clock * SPIN) / st.spin;
    const cshift = st.cloudSpin ? (clock * SPIN) / st.cloudSpin : 0;
    // light in the globe's own frame (the globe is drawn turned by rho)
    const rho = b.rho + roll;
    const c = Math.cos(rho);
    const s = Math.sin(rho);
    const gx = lx * c + ly * s;
    const gy = -(-lx * s + ly * c);
    const animated = !!(st.bands || st.vortex);
    const due =
      !g.ready ||
      Math.abs(shift - g.shift) * base.w >= 0.33 ||
      Math.abs(cshift - g.cshift) * base.w >= 0.33 ||
      Math.abs(gx - g.lx) + Math.abs(gy - g.ly) > 0.02 ||
      (animated && clock - g.at >= 0.05);
    if (!due) return g;
    if (st.bands) {
      if (!b.bands) b.bands = new Float32Array(MAP_ROWS);
      for (let j = 0; j < MAP_ROWS; j++) {
        const lat = (0.5 - (j + 0.5) / MAP_ROWS) * Math.PI;
        const v = st.bands(lat) * clock * SPIN;
        b.bands[j] = v - Math.floor(v);
      }
    }
    let vortex: GlobeStyle["vortex"] = null;
    if (st.vortex) {
      const T = 4;
      const p1 = (clock / T) % 1;
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
        dust: null,
      },
      { x: (gx / L) * 0.88, y: (gy / L) * 0.88, z: 0.475 }
    );
    g.ctx.putImageData(g.img, 0, 0);
    g.shift = shift;
    g.cshift = cshift;
    g.lx = gx;
    g.ly = gy;
    g.at = clock;
    g.ready = true;
    return g;
  }

  /* ── drawing ──────────────────────────────────────────────────────── */

  function lightOf(b: BodyState) {
    const sx = sun.x - b.x;
    const sy = sun.y - b.y;
    const len = Math.hypot(sx, sy) || 1;
    return [sx / len, sy / len] as const;
  }

  function drawStars() {
    // the field drifts a touch against the tilt, and each brightness level
    // breathes on its own slow cycle
    const ox = -tiltX * 6;
    const oy = -tiltY * 4;
    for (let lvl = 0; lvl < 3; lvl++) {
      ctx.beginPath();
      for (const st of stars) {
        if (st.level !== lvl) continue;
        ctx.rect(st.x + ox, st.y + oy, st.r * 1.6, st.r * 1.6);
      }
      const base = lvl === 0 ? 0.08 : lvl === 1 ? 0.15 : 0.26;
      const twinkle = opts.reducedMotion
        ? 1
        : 0.8 + 0.2 * Math.sin(clock * (0.7 + lvl * 0.45) + lvl * 2.1);
      ctx.fillStyle = `rgba(255,255,255,${(base * twinkle).toFixed(3)})`;
      ctx.fill();
    }
  }

  function drawBelt() {
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    for (const bright of [false, true]) {
      ctx.beginPath();
      for (const r of rocks) {
        if (r.bright !== bright) continue;
        const th = r.a0 + r.w * time;
        const X = r.R * Math.cos(th);
        const Y = -k * r.R * Math.sin(th);
        ctx.rect(cx + X * cr - Y * sr, cy + X * sr + Y * cr, r.s, r.s);
      }
      ctx.fillStyle = bright
        ? "rgba(214,198,176,0.34)"
        : "rgba(180,170,160,0.17)";
      ctx.fill();
    }
  }

  function drawOrbits(near: boolean) {
    const from = near ? 0 : Math.PI;
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    const half = (b: BodyState) => {
      const x = b.R * Math.cos(from);
      ctx.moveTo(cx + x * c, cy + x * s);
      ctx.ellipse(cx, cy, b.R, k * b.R, roll, from, from + Math.PI);
    };
    ctx.beginPath();
    for (const b of bodies) if (b.index > 0) half(b);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255,255,255,${near ? 0.085 : 0.05})`;
    ctx.stroke();
    // the hovered planet's orbit picks up the highlight
    for (const b of bodies) {
      if (b.index === 0 || b.hover < 0.01) continue;
      ctx.beginPath();
      half(b);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgba(highlight, (near ? 0.42 : 0.24) * b.hover);
      ctx.stroke();
    }
  }

  function drawRings(b: BodyState, r: number, front: boolean) {
    const rg = b.data.rings;
    if (!rg) return;
    const inner = rg.inner * r;
    const width = (rg.outer - rg.inner) * r;
    const rho = b.rho + roll;
    const c = Math.cos(rho) * dpr;
    const sn = Math.sin(rho) * dpr;
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
      ctx.strokeStyle = rgba(b.ringColor, rg.opacity * op);
      ctx.stroke();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMoonOrbits(b: BodyState, front: boolean, alpha: number) {
    if (alpha <= 0.002 || !b.moons.length) return;
    const from = front ? 0 : Math.PI;
    const dir = front ? 1 : -1;
    ctx.beginPath();
    for (const m of b.moons) {
      const a = m.data.orbitRadius * b.rs;
      const rho = m.rho + roll;
      ctx.moveTo(b.x + dir * a * Math.cos(rho), b.y + dir * a * Math.sin(rho));
      ctx.ellipse(b.x, b.y, a, a * m.f, rho, from, from + Math.PI);
    }
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.stroke();
  }

  function drawMoon(m: MoonState, lx: number, ly: number) {
    const r = m.rs;
    const color = parseColor(m.data.color, [160, 160, 160]);
    if (r < 1.6) {
      ctx.fillStyle = rgba(color, 0.9);
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
    g.addColorStop(0, rgba(tint(color, 1.25), 1));
    g.addColorStop(0.55, rgba(color, 1));
    g.addColorStop(1, rgba(tint(color, 0.28), 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, TAU);
    ctx.fill();
  }

  /** the static sprite, shaded away from the Sun */
  function drawSprite(b: BodyState, r: number, lx: number, ly: number) {
    if (!b.sprite) {
      ctx.fillStyle = b.fallback;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, TAU);
      ctx.fill();
    } else {
      const rho = b.rho + roll;
      if (rho) {
        const c = Math.cos(rho) * dpr;
        const sn = Math.sin(rho) * dpr;
        ctx.setTransform(c, sn, -sn, c, b.x * dpr, b.y * dpr);
        ctx.drawImage(b.sprite, -r, -r, r * 2, r * 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.drawImage(b.sprite, b.x - r, b.y - r, r * 2, r * 2);
      }
    }
    if (r < 3) return;
    const g = ctx.createLinearGradient(
      b.x + lx * r,
      b.y + ly * r,
      b.x - lx * r,
      b.y - ly * r
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.45, "rgba(0,0,0,0.03)");
    g.addColorStop(0.64, "rgba(0,0,0,0.47)");
    g.addColorStop(1, "rgba(0,0,0,0.76)");
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 0.3, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
  }

  /** the rotating globe over the sprite, faded in with the hover */
  function drawGlobe(b: BodyState, r: number, lx: number, ly: number) {
    if (!hoverable || b.hover < 0.02 || r < 4) return;
    const g = updateGlobe(b, lx, ly);
    if (!g || !g.ready) return;
    ctx.globalAlpha = ease(clamp((b.hover - 0.05) / 0.6, 0, 1));
    const rho = b.index === 0 ? 0 : b.rho + roll;
    if (rho) {
      const c = Math.cos(rho) * dpr;
      const sn = Math.sin(rho) * dpr;
      ctx.setTransform(c, sn, -sn, c, b.x * dpr, b.y * dpr);
      ctx.drawImage(g.canvas, -r, -r, r * 2, r * 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.drawImage(g.canvas, b.x - r, b.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawSun() {
    const r = sun.rs;
    const breath = opts.reducedMotion ? 1 : 1 + 0.035 * Math.sin(clock * 0.7);
    const outer = r * (2.7 + 0.5 * sun.hover) * breath;
    ctx.globalAlpha = 0.82 + 0.18 * sun.hover;
    ctx.drawImage(sunGlow(), cx - outer, cy - outer, outer * 2, outer * 2);
    ctx.globalAlpha = 1;
    if (sunSprites.length) {
      // two granulation layers cross-fading: slow, subtle surface movement
      ctx.drawImage(sunSprites[0], cx - r, cy - r, r * 2, r * 2);
      ctx.globalAlpha = opts.reducedMotion
        ? 0.5
        : 0.5 + 0.5 * Math.sin(clock * 0.45);
      ctx.drawImage(sunSprites[1], cx - r, cy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = sun.fallback;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }
    drawGlobe(sun, r, 0, 0);
  }

  function drawPlanet(b: BodyState) {
    const r = b.rs;
    const [lx, ly] = lightOf(b);
    const orbitAlpha = 0.16 * b.hover;
    drawMoonOrbits(b, false, orbitAlpha);
    for (const m of b.moons) if (m.depth < 0) drawMoon(m, lx, ly);
    drawRings(b, r, false);
    drawSprite(b, r, lx, ly);
    drawGlobe(b, r, lx, ly);
    if (b.atmoSprite) {
      ctx.globalAlpha = 1 - 0.4 * b.hover;
      ctx.drawImage(
        b.atmoSprite,
        b.x - r * 1.3,
        b.y - r * 1.3,
        r * 2.6,
        r * 2.6
      );
      ctx.globalAlpha = 1;
    }
    drawRings(b, r, true);
    drawMoonOrbits(b, true, orbitAlpha);
    for (const m of b.moons) if (m.depth >= 0) drawMoon(m, lx, ly);
  }

  /** a thin ring round the hovered body and its name, with the link arrow */
  function drawTarget() {
    if (!target) return;
    const b = target.body;
    const m = target.moon;
    const a = opts.reducedMotion ? 1 : ease(b.hover);
    if (a < 0.02) return;
    const x = m ? m.x : b.x;
    const y = m ? m.y : b.y;
    const r = m
      ? Math.max(5, m.rs + 4)
      : b.index === 0
        ? b.rs * 1.18 + 4
        : b.rs * (b.data.rings ? 2.35 : 1.4) + 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(highlight, 0.6 * a);
    ctx.stroke();

    const name = (m ? m.data.name : b.data.name).toUpperCase();
    const fs = 11;
    ctx.font = `600 ${fs}px ${opts.fontFamily || "sans-serif"}`;
    ctx.letterSpacing = `${(fs * 0.12).toFixed(2)}px`;
    const text = `${name}  ↗`;
    const w = ctx.measureText(text).width;
    // right of the ring, or left of it when that would leave the canvas
    let lxp = x + r * 0.72 + 10;
    if (lxp + w + 14 > W) lxp = x - r * 0.72 - 10 - w - 12;
    const lyp = clamp(y - r * 0.72 - 6, 12, H - 12);
    ctx.textBaseline = "middle";
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba(highlight, 1);
    ctx.beginPath();
    ctx.arc(lxp + 3, lyp, 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(239,239,239,0.92)";
    ctx.fillText(text, lxp + 12, lyp + 0.5);
    ctx.globalAlpha = 1;
    ctx.letterSpacing = "0px";
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawStars();
    drawBelt();
    // far to near (insertion sort in place: no allocation per frame)
    for (let i = 1; i < order.length; i++) {
      const v = order[i];
      let j = i - 1;
      while (j >= 0 && bodies[order[j]].depth > bodies[v].depth) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = v;
    }
    const lifted = target && target.body.index > 0 ? target.body : null;
    drawOrbits(false);
    for (let i = 0; i < order.length; i++) {
      const b = bodies[order[i]];
      if (b.depth < 0 && b !== lifted) drawPlanet(b);
    }
    drawSun();
    drawOrbits(true);
    for (let i = 0; i < order.length; i++) {
      const b = bodies[order[i]];
      if (b.depth >= 0 && b !== lifted) drawPlanet(b);
    }
    // the hovered planet comes forward, over everything else
    if (lifted) drawPlanet(lifted);
    drawTarget();
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
    // 60fps is plenty (high-refresh screens would draw it twice as often);
    // phones run at 30
    acc += dt;
    const minStep = opts.lowPower ? 1 / 30 : 1 / 62;
    if (acc < minStep) return;
    dt = Math.min(0.1, acc);
    acc = 0;
    step(dt);
    draw();
    frames++;
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
      for (const b of bodies) b.globe = null;
      queueSprites();
      renderStatic();
    },
    pointer(x, y) {
      px = x ?? NaN;
      py = y ?? NaN;
      // nothing animates under reduced motion: redraw for the hover
      if (!running) renderStatic();
    },
    start() {
      if (running || opts.reducedMotion) return;
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
      cancelSprites();
      maps?.destroy();
      maps = null;
      luts.clear();
      sunSprites = [];
      for (const b of bodies) {
        b.sprite = null;
        b.atmoSprite = null;
        b.globe = null;
      }
      canvas.width = 0;
      canvas.height = 0;
    },
    snapshot() {
      return {
        width: W,
        height: H,
        time,
        speed,
        k,
        roll,
        hovered: target ? (target.moon ?? target.body).data.id : null,
        frames,
        sprites:
          bodies.filter((b) => b.index > 0 && b.sprite).length +
          (sunSprites.length ? 1 : 0),
        maps: maps?.ready() ?? 0,
        bodies: bodies.map((b) => ({
          id: b.data.id,
          x: b.x,
          y: b.y,
          rs: b.rs,
          R: b.R,
          theta: b.theta,
          depth: b.depth,
          hover: b.hover,
          globe: !!b.globe?.ready && b.hover > 0.02,
        })),
        moons: bodies.flatMap((b) =>
          b.moons.map((m) => ({
            id: m.data.id,
            parent: b.data.id,
            x: m.x,
            y: m.y,
            rs: m.rs,
            depth: m.depth,
          }))
        ),
      };
    },
  };
}
