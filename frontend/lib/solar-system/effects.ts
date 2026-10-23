import { mulberry32 } from "./textures";

/**
 * Environmental effects around the focused body: one particle system per
 * celestial object, each with its own character (flames and flares on the
 * Sun, dust and sparks on Mercury, a wrapped haze on Venus, an atmosphere on
 * Earth, dust storms on Mars, storms and lightning on Jupiter, ring traffic
 * on Saturn, ice winds on Uranus, fluid ribbons on Neptune).
 *
 * - Every pool is allocated once (typed arrays); update and draw loops
 *   allocate nothing.
 * - `amount` (the body's focus, 0..1) scales how many particles are alive
 *   and how strong everything is: full for the focused body, fading in and
 *   out through transitions, and no particles at all when unfocused.
 * - Coordinates are in units of the body's on-screen radius, around its
 *   centre, so effects follow the body and scale with the camera.
 * - Drawing is split into a pass behind the globe and one in front, so
 *   particles pass behind the planet and are hidden by it.
 */

export type EffectEnv = {
  /** body centre and radius on screen (CSS px) */
  x: number;
  y: number;
  r: number;
  /** tilt and foreshortening of the body's equatorial plane */
  rho: number;
  flat: number;
  /** unit vector from the body toward the Sun, on screen */
  lx: number;
  ly: number;
  /** focus intensity 0..1 */
  amount: number;
  t: number;
  dt: number;
  /** a surface feature's position on the visible hemisphere (radians), if any */
  spot: { lam: number; phi: number } | null;
};

export type Effect = {
  update(env: EffectEnv): void;
  back(ctx: CanvasRenderingContext2D, env: EffectEnv): void;
  front(ctx: CanvasRenderingContext2D, env: EffectEnv): void;
  /** particles currently alive (tests and budgets) */
  live(): number;
  /** Mars: a dust front sweeping across the visible face, -1..1 */
  dustFront?: () => { at: number; amount: number } | null;
  /** builds size-dependent sprites ahead of time (idle warm-up) */
  prepare?: (r: number) => void;
};

type RGB = [number, number, number];
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** fade in over the first 12% of a life, out over the last 40% */
const lifeFade = (q: number) =>
  q < 0.12 ? q / 0.12 : q > 0.6 ? clamp((1 - q) / 0.4, 0, 1) : 1;

/* ── soft dot sprites, one per colour, shared by every effect ────────── */
const dots = new Map<string, HTMLCanvasElement>();
const dotRGB: string[] = [];
const dotId = new WeakMap<HTMLCanvasElement, number>();
function dot(c: RGB, core = 0.25): HTMLCanvasElement {
  const key = `${c.join(",")}|${core}`;
  let s = dots.get(key);
  if (s) return s;
  s = document.createElement("canvas");
  s.width = s.height = 32;
  const o = s.getContext("2d");
  if (o) {
    const g = o.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},1)`);
    g.addColorStop(core, `rgba(${c[0]},${c[1]},${c[2]},0.8)`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    o.fillStyle = g;
    o.fillRect(0, 0, 32, 32);
  }
  dots.set(key, s);
  dotId.set(s, dotRGB.length);
  dotRGB.push(c.join(","));
  return s;
}

/* ── small particles are batched ─────────────────────────────────────
   Most particles are only a pixel or two across. Drawing each as its own
   scaled image costs far more than it shows, so small ones are collected
   during a pass and filled at its end as a handful of paths: one per
   colour and alpha level. Larger soft particles still draw as sprites. */
const BMAX = 4096;
const BUCKETS = [0.08, 0.2, 0.36, 0.56, 0.82];
const bx = new Float32Array(BMAX);
const by = new Float32Array(BMAX);
const bs = new Float32Array(BMAX);
const bk = new Uint16Array(BMAX);
const seen = new Uint8Array(512);
let bn = 0;
let bmode: GlobalCompositeOperation = "source-over";
const bucketOf = (a: number) =>
  a < 0.14 ? 0 : a < 0.28 ? 1 : a < 0.46 ? 2 : a < 0.68 ? 3 : 4;

/** draws the batched small particles; the engine calls it after each pass */
export function flushParticles(ctx: CanvasRenderingContext2D) {
  if (!bn) return;
  const mode = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = bmode;
  ctx.globalAlpha = 1;
  seen.fill(0);
  for (let i = 0; i < bn; i++) {
    const key = bk[i];
    if (seen[key]) continue;
    seen[key] = 1;
    const rgb = dotRGB[key >> 3];
    const al = BUCKETS[key & 7];
    // specks: one small square each; larger dots: a faint halo and a core,
    // which reads as a soft particle without drawing an image per particle
    ctx.beginPath();
    let halos = false;
    for (let j = i; j < bn; j++) {
      if (bk[j] !== key) continue;
      const h = bs[j];
      if (h < 1.3) ctx.rect(bx[j] - h, by[j] - h, h * 2, h * 2);
      else {
        ctx.moveTo(bx[j] + h * 0.5, by[j]);
        ctx.arc(bx[j], by[j], h * 0.5, 0, Math.PI * 2);
        halos = true;
      }
    }
    ctx.fillStyle = `rgba(${rgb},${al})`;
    ctx.fill();
    if (halos) {
      ctx.beginPath();
      for (let j = i; j < bn; j++) {
        if (bk[j] !== key || bs[j] < 1.3) continue;
        ctx.moveTo(bx[j] + bs[j], by[j]);
        ctx.arc(bx[j], by[j], bs[j], 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(${rgb},${(al * 0.38).toFixed(3)})`;
      ctx.fill();
    }
  }
  bn = 0;
  ctx.globalCompositeOperation = mode;
}

/** always an image: for haze, dust clouds and plumes, which must stay soft */
function soft(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  x: number,
  y: number,
  s: number,
  a: number
) {
  if (a <= 0.004 || s <= 0.05) return;
  ctx.globalAlpha = a > 1 ? 1 : a;
  ctx.drawImage(img, x - s, y - s, s * 2, s * 2);
}

function sprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  x: number,
  y: number,
  s: number,
  a: number
) {
  if (a <= 0.004 || s <= 0.05) return;
  if (s < 6) {
    const mode = ctx.globalCompositeOperation;
    if (bn && (mode !== bmode || bn >= BMAX)) flushParticles(ctx);
    bmode = mode;
    bx[bn] = x;
    by[bn] = y;
    bs[bn] = Math.max(0.55, s * 0.72);
    bk[bn] = ((dotId.get(img) ?? 0) << 3) + bucketOf(a);
    bn++;
    return;
  }
  ctx.globalAlpha = a > 1 ? 1 : a;
  ctx.drawImage(img, x - s, y - s, s * 2, s * 2);
}

/** struct-of-arrays particle pool */
class Pool {
  readonly n: number;
  a: Float32Array; // angle / position u
  b: Float32Array; // radius / position v
  c: Float32Array; // depth / position w
  va: Float32Array;
  vb: Float32Array;
  age: Float32Array;
  life: Float32Array;
  size: Float32Array;
  seed: Float32Array;
  px: Float32Array; // previous screen-local position (streaks)
  py: Float32Array;
  constructor(n: number) {
    this.n = Math.max(0, n | 0);
    const f = () => new Float32Array(this.n);
    this.a = f();
    this.b = f();
    this.c = f();
    this.va = f();
    this.vb = f();
    this.age = f();
    this.life = f();
    this.size = f();
    this.seed = f();
    this.px = f();
    this.py = f();
  }
}

/** a point in the body's (tilted, foreshortened) equatorial plane, in radii */
function plane(env: EffectEnv, rad: number, th: number, out: Float32Array) {
  const u = rad * Math.cos(th);
  const v = rad * Math.sin(th) * env.flat;
  const c = Math.cos(env.rho);
  const s = Math.sin(env.rho);
  out[0] = u * c - v * s;
  out[1] = u * s + v * c;
}

/** a point on the visible hemisphere (longitude from centre, latitude), in radii */
function onSphere(env: EffectEnv, lam: number, phi: number, out: Float32Array) {
  const u = Math.cos(phi) * Math.sin(lam);
  const v = -Math.sin(phi);
  const c = Math.cos(env.rho);
  const s = Math.sin(env.rho);
  out[0] = u * c - v * s;
  out[1] = u * s + v * c;
  out[2] = Math.cos(phi) * Math.cos(lam);
}

/** sunlit fraction at a surface direction (u, v screen-down, w toward us) */
function lit(env: EffectEnv, u: number, v: number, w: number) {
  const d = u * env.lx + v * env.ly + w * 0.25;
  return clamp((d + 0.15) / 1.15, 0, 1);
}

/** a soft ring of light around the limb, optionally brighter on the day side */
const rims = new Map<string, HTMLCanvasElement>();
function rimGlow(
  ctx: CanvasRenderingContext2D,
  env: EffectEnv,
  c: RGB,
  inner: number,
  outer: number,
  alpha: number,
  daySide = 0
) {
  if (alpha <= 0.004) return;
  const key = `${c.join(",")}|${inner}|${outer}`;
  let img = rims.get(key);
  if (!img) {
    // drawn once at full strength; scaled and faded per frame
    img = document.createElement("canvas");
    img.width = img.height = 128;
    const o = img.getContext("2d");
    if (o) {
      const g = o.createRadialGradient(
        64,
        64,
        (64 * inner) / outer,
        64,
        64,
        64
      );
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      g.addColorStop(0.18, `rgba(${c[0]},${c[1]},${c[2]},1)`);
      g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      o.fillStyle = g;
      o.fillRect(0, 0, 128, 128);
    }
    rims.set(key, img);
  }
  const off = daySide * 0.12;
  const x = env.x + env.lx * env.r * off;
  const y = env.y + env.ly * env.r * off;
  const R = env.r * outer;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(img, x - R, y - R, R * 2, R * 2);
  ctx.globalAlpha = 1;
}

/** a bright crescent on the sunward limb */
function dayLimb(
  ctx: CanvasRenderingContext2D,
  env: EffectEnv,
  c: RGB,
  width: number,
  alpha: number,
  spread = 1.25
) {
  if (alpha <= 0.004) return;
  const a0 = Math.atan2(env.ly, env.lx);
  ctx.globalAlpha = 1;
  ctx.lineCap = "round";
  ctx.lineWidth = env.r * width;
  ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(env.x, env.y, env.r * (1 + width * 0.3), a0 - spread, a0 + spread);
  ctx.stroke();
}

const P = new Float32Array(3);

/* ═══════════════════════════════ SUN ═══════════════════════════════ */
function sunEffect(budget: number, rand: () => number): Effect {
  const flames = new Pool(Math.round(budget * 0.62));
  const blobs = new Pool(Math.max(4, Math.round(budget * 0.06)));
  const jet = new Pool(Math.round(budget * 0.18));
  const loops = new Pool(4);
  // flame tongues licking off the limb: base angle, length, flicker rate, phase
  const tongues = new Pool(Math.max(14, Math.round(budget * 0.1)));
  for (let i = 0; i < tongues.n; i++) {
    tongues.a[i] = (i / tongues.n) * TAU + (rand() - 0.5) * 0.3;
    tongues.b[i] = 0.07 + rand() * 0.16;
    tongues.va[i] = 0.9 + rand() * 1.8;
    tongues.seed[i] = rand() * TAU;
  }
  // plumes: soft, elongated tongues of plasma rising off the limb
  const plumes = new Pool(Math.max(8, Math.round(budget * 0.07)));
  const spawnPlume = (i: number) => {
    plumes.a[i] = rand() * TAU;
    plumes.b[i] = 0.98 + rand() * 0.04;
    plumes.va[i] = 0.05 + rand() * 0.09;
    plumes.age[i] = 0;
    plumes.life[i] = 2.4 + rand() * 2.6;
    plumes.size[i] = 0.07 + rand() * 0.09;
  };
  for (let i = 0; i < plumes.n; i++) {
    spawnPlume(i);
    plumes.age[i] = rand() * plumes.life[i];
  }
  const flare = { age: 99, life: 1.6, a: 0, next: 4 + rand() * 4 };
  const hot = dot([255, 236, 190], 0.3);
  const gold = dot([255, 178, 70], 0.25);
  const ember = dot([240, 92, 34], 0.2);
  const plasma = dot([255, 140, 50], 0.1);
  let corona: HTMLCanvasElement | null = null;
  let coronaFor = 0;

  const spawnFlame = (i: number) => {
    flames.a[i] = rand() * TAU;
    flames.b[i] = 0.97 + rand() * 0.04;
    flames.va[i] = 0.08 + rand() * rand() * 0.36;
    flames.vb[i] = (rand() - 0.5) * 0.3;
    flames.age[i] = 0;
    flames.life[i] = 1.1 + rand() * 2.6;
    flames.size[i] = 0.012 + rand() * rand() * 0.04;
    flames.seed[i] = rand();
  };
  const spawnBlob = (i: number) => {
    blobs.a[i] = rand() * TAU;
    blobs.b[i] = 0.96 + rand() * 0.12;
    blobs.va[i] = 0.025 + rand() * 0.06;
    blobs.age[i] = 0;
    blobs.life[i] = 4 + rand() * 4.5;
    blobs.size[i] = 0.22 + rand() * 0.3;
  };
  const spawnLoop = (i: number) => {
    loops.a[i] = rand() * TAU;
    loops.b[i] = 0.12 + rand() * 0.24; // half-span (rad)
    loops.c[i] = 0.25 + rand() * 0.55; // height (radii)
    loops.age[i] = -rand() * 3;
    loops.life[i] = 5 + rand() * 4;
  };
  for (let i = 0; i < flames.n; i++) {
    spawnFlame(i);
    flames.age[i] = rand() * flames.life[i];
  }
  for (let i = 0; i < blobs.n; i++) {
    spawnBlob(i);
    blobs.age[i] = rand() * blobs.life[i];
  }
  for (let i = 0; i < loops.n; i++) spawnLoop(i);
  for (let i = 0; i < jet.n; i++) jet.age[i] = jet.life[i] = 1;

  function coronaSprite(r: number) {
    // long soft streamers around the disk, drawn once per size
    const want = Math.min(520, Math.ceil(r * 4.6));
    if (corona && Math.abs(coronaFor - want) < want * 0.25) return corona;
    coronaFor = want;
    const c = document.createElement("canvas");
    c.width = c.height = want;
    const o = c.getContext("2d");
    if (o) {
      const R = want / 2;
      const rr = R / 2.3;
      const rnd = mulberry32(77);
      o.translate(R, R);
      o.globalCompositeOperation = "lighter";
      for (let i = 0; i < 46; i++) {
        const th = rnd() * TAU;
        const w = 0.04 + rnd() * 0.16;
        const len = rr * (1.35 + rnd() * rnd() * 0.95);
        const g = o.createRadialGradient(0, 0, rr * 0.92, 0, 0, len);
        const a = 0.05 + rnd() * 0.09;
        g.addColorStop(0, `rgba(255,196,120,${a})`);
        g.addColorStop(0.45, `rgba(255,150,70,${a * 0.45})`);
        g.addColorStop(1, "rgba(255,120,50,0)");
        o.fillStyle = g;
        o.beginPath();
        o.moveTo(Math.cos(th - w) * rr * 0.9, Math.sin(th - w) * rr * 0.9);
        o.quadraticCurveTo(
          Math.cos(th) * len * 0.55,
          Math.sin(th) * len * 0.55,
          Math.cos(th) * len,
          Math.sin(th) * len
        );
        o.quadraticCurveTo(
          Math.cos(th) * len * 0.55,
          Math.sin(th) * len * 0.55,
          Math.cos(th + w) * rr * 0.9,
          Math.sin(th + w) * rr * 0.9
        );
        o.closePath();
        o.fill();
      }
      const g = o.createRadialGradient(0, 0, rr * 0.9, 0, 0, R);
      g.addColorStop(0, "rgba(255,190,110,0.32)");
      g.addColorStop(0.3, "rgba(255,140,60,0.08)");
      g.addColorStop(1, "rgba(255,120,40,0)");
      o.fillStyle = g;
      o.fillRect(-R, -R, want, want);
    }
    corona = c;
    return c;
  }

  const bez = (
    t: number,
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number
  ) => {
    const u = 1 - t;
    P[0] = u * u * x0 + 2 * u * t * cx + t * t * x1;
    P[1] = u * u * y0 + 2 * u * t * cy + t * t * y1;
  };

  return {
    prepare(r) {
      coronaSprite(r);
    },
    live() {
      let n = 0;
      for (let i = 0; i < flames.n; i++)
        if (flames.age[i] < flames.life[i]) n++;
      for (let i = 0; i < jet.n; i++) if (jet.age[i] < jet.life[i]) n++;
      return n + blobs.n;
    },
    update(env) {
      const dt = env.dt;
      const keep = Math.round(flames.n * env.amount);
      for (let i = 0; i < flames.n; i++) {
        flames.age[i] += dt;
        if (flames.age[i] >= flames.life[i]) {
          if (i < keep) spawnFlame(i);
          continue;
        }
        flames.b[i] += flames.va[i] * dt;
        flames.a[i] += (flames.vb[i] * dt) / flames.b[i];
        flames.va[i] *= 1 - 0.18 * dt;
      }
      for (let i = 0; i < blobs.n; i++) {
        blobs.age[i] += dt;
        if (blobs.age[i] >= blobs.life[i]) spawnBlob(i);
        blobs.b[i] += blobs.va[i] * dt;
      }
      for (let i = 0; i < loops.n; i++) {
        loops.age[i] += dt;
        if (loops.age[i] >= loops.life[i]) spawnLoop(i);
      }
      for (let i = 0; i < plumes.n; i++) {
        plumes.age[i] += dt;
        if (plumes.age[i] >= plumes.life[i]) spawnPlume(i);
        plumes.b[i] += plumes.va[i] * dt;
      }
      for (let i = 0; i < jet.n; i++) {
        if (jet.age[i] >= jet.life[i]) continue;
        jet.age[i] += dt;
        jet.b[i] += jet.va[i] * dt;
        jet.va[i] *= 1 - 1.4 * dt;
      }
      flare.age += dt;
      flare.next -= dt * env.amount;
      if (flare.next <= 0 && env.amount > 0.6) {
        flare.next = 6 + rand() * 5;
        flare.age = 0;
        flare.a = rand() * TAU;
        const n = Math.round(jet.n * env.amount);
        for (let i = 0; i < n; i++) {
          jet.a[i] = flare.a + (rand() - 0.5) * 0.5;
          jet.b[i] = 1;
          jet.va[i] = 0.7 + rand() * 1.2;
          jet.age[i] = 0;
          jet.life[i] = 0.7 + rand() * 0.9;
          jet.size[i] = 0.02 + rand() * 0.035;
        }
      }
    },
    back(ctx, env) {
      const { x, y, r, amount, t } = env;
      ctx.globalCompositeOperation = "lighter";
      // corona: two copies of the streamers, slowly turning against each other
      const cs = coronaSprite(r);
      const size = r * 4.6 * (1 + 0.025 * Math.sin(t * 0.5));
      ctx.globalAlpha = 0.5 * amount;
      for (let k = 0; k < 2; k++) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((k ? -1 : 1) * t * 0.012 + k * 1.3);
        ctx.drawImage(cs, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      // large slow plasma shapes hugging the limb
      for (let i = 0; i < blobs.n; i++) {
        const q = blobs.age[i] / blobs.life[i];
        const d = blobs.b[i] * r;
        soft(
          ctx,
          plasma,
          x + Math.cos(blobs.a[i]) * d,
          y + Math.sin(blobs.a[i]) * d,
          blobs.size[i] * r,
          0.13 * amount * lifeFade(q)
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
    front(ctx, env) {
      const { x, y, r, amount, t } = env;
      ctx.globalCompositeOperation = "lighter";
      // prominences: magnetic loops rising from the limb, plasma flowing along them
      for (let i = 0; i < loops.n; i++) {
        const q = loops.age[i] / loops.life[i];
        if (q <= 0 || q >= 1) continue;
        const grow = smooth(0, 0.3, q);
        const a = lifeFade(q) * amount;
        if (a < 0.01) continue;
        const a0 = loops.a[i] - loops.b[i];
        const a1 = loops.a[i] + loops.b[i];
        const x0 = x + Math.cos(a0) * r * 0.99;
        const y0 = y + Math.sin(a0) * r * 0.99;
        const x1 = x + Math.cos(a1) * r * 0.99;
        const y1 = y + Math.sin(a1) * r * 0.99;
        const h = 1 + loops.c[i] * grow * 1.9;
        const cx = x + Math.cos(loops.a[i]) * r * h;
        const cy = y + Math.sin(loops.a[i]) * r * h;
        ctx.globalAlpha = 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.lineWidth = r * 0.11;
        ctx.strokeStyle = `rgba(255,110,40,${(0.16 * a).toFixed(3)})`;
        ctx.stroke();
        ctx.lineWidth = r * 0.035;
        ctx.strokeStyle = `rgba(255,196,120,${(0.5 * a).toFixed(3)})`;
        ctx.stroke();
        for (let k = 0; k < 5; k++) {
          const u = (t * 0.32 + k / 5 + i * 0.13) % 1;
          bez(u, x0, y0, cx, cy, x1, y1);
          sprite(
            ctx,
            hot,
            P[0],
            P[1],
            r * 0.045,
            0.6 * a * Math.sin(u * Math.PI)
          );
        }
      }
      // flame tongues: short curved licks of plasma that flicker and bend
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let i = 0; i < tongues.n; i++) {
          const f = 0.5 + 0.5 * Math.sin(t * tongues.va[i] + tongues.seed[i]);
          const len = tongues.b[i] * (0.25 + 0.75 * f * f) * (pass ? 0.55 : 1);
          const th = tongues.a[i];
          const bend = 0.1 * Math.sin(t * 1.3 + tongues.seed[i] * 3);
          const r0 = r * 0.985;
          const r1 = r * (1 + len);
          ctx.moveTo(x + Math.cos(th) * r0, y + Math.sin(th) * r0);
          ctx.quadraticCurveTo(
            x + Math.cos(th + bend * 0.5) * (r0 + r1) * 0.5,
            y + Math.sin(th + bend * 0.5) * (r0 + r1) * 0.5,
            x + Math.cos(th + bend) * r1,
            y + Math.sin(th + bend) * r1
          );
        }
        ctx.globalAlpha = 1;
        ctx.lineCap = "round";
        ctx.lineWidth = r * (pass ? 0.016 : 0.055);
        ctx.strokeStyle = pass
          ? `rgba(255,210,130,${(0.26 * amount).toFixed(3)})`
          : `rgba(255,110,30,${(0.16 * amount).toFixed(3)})`;
        ctx.stroke();
      }
      // plumes, stretched along the direction they rise (in the engine's
      // own transform, which carries the device pixel ratio)
      const base = ctx.getTransform();
      for (let i = 0; i < plumes.n; i++) {
        const q = plumes.age[i] / plumes.life[i];
        const a = 0.22 * amount * lifeFade(q);
        if (a < 0.01) continue;
        const th = plumes.a[i];
        const d = plumes.b[i] * r;
        const len = plumes.size[i] * r * (1 + q * 1.6);
        ctx.setTransform(base);
        ctx.translate(x + Math.cos(th) * d, y + Math.sin(th) * d);
        ctx.rotate(th);
        ctx.scale(2.6, 1);
        ctx.globalAlpha = a;
        ctx.drawImage(
          q < 0.5 ? gold : ember,
          -len / 2.6,
          -len / 2.6,
          (len * 2) / 2.6,
          (len * 2) / 2.6
        );
      }
      ctx.setTransform(base);
      // embers carried outward: white-hot, then gold, then ember red
      for (let i = 0; i < flames.n; i++) {
        const q = flames.age[i] / flames.life[i];
        if (q >= 1) continue;
        const d = flames.b[i] * r;
        const px = x + Math.cos(flames.a[i]) * d;
        const py = y + Math.sin(flames.a[i]) * d;
        const s = Math.max(0.6, flames.size[i] * r * (0.7 + q * 0.8));
        const al = 0.42 * amount * lifeFade(q);
        sprite(ctx, q < 0.3 ? hot : q < 0.62 ? gold : ember, px, py, s, al);
      }
      // flare: a flash at the limb and a jet of plasma
      if (flare.age < flare.life) {
        const q = flare.age / flare.life;
        const fx = x + Math.cos(flare.a) * r;
        const fy = y + Math.sin(flare.a) * r;
        const pk = q < 0.12 ? q / 0.12 : Math.exp(-(q - 0.12) * 3.2);
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 0.75);
        g.addColorStop(
          0,
          `rgba(255,248,225,${(0.75 * pk * amount).toFixed(3)})`
        );
        g.addColorStop(
          0.25,
          `rgba(255,190,100,${(0.3 * pk * amount).toFixed(3)})`
        );
        g.addColorStop(1, "rgba(255,140,60,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fx, fy, r * 0.75, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < jet.n; i++) {
        const q = jet.age[i] / jet.life[i];
        if (q >= 1) continue;
        const d = jet.b[i] * r;
        sprite(
          ctx,
          q < 0.4 ? hot : gold,
          x + Math.cos(jet.a[i]) * d,
          y + Math.sin(jet.a[i]) * d,
          jet.size[i] * r,
          0.8 * (1 - q) * amount
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

/* ═════════════════════════════ MERCURY ═════════════════════════════ */
function mercuryEffect(budget: number, rand: () => number): Effect {
  const dust = new Pool(Math.round(budget * 0.4));
  const sparks = new Pool(Math.round(budget * 0.2));
  const tail = new Pool(Math.round(budget * 0.34));
  const streak = {
    age: 99,
    life: 0.75,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    next: 2 + rand() * 3,
  };
  const grit = dot([150, 132, 116], 0.45);
  const spark = dot([255, 214, 160], 0.3);
  const sodium = dot([255, 196, 110], 0.15);
  for (let i = 0; i < dust.n; i++) {
    dust.a[i] = rand() * TAU;
    dust.b[i] = 1.15 + rand() * 0.75;
    dust.va[i] = (rand() < 0.5 ? -1 : 1) * (0.06 + rand() * 0.22);
    dust.size[i] = 0.012 + rand() * 0.02;
    dust.seed[i] = 0.25 + rand() * 0.35;
  }
  const spawnSpark = (i: number, env: EffectEnv) => {
    const a = Math.atan2(env.ly, env.lx) + (rand() - 0.5) * 2.2;
    sparks.a[i] = a;
    sparks.b[i] = 1 + rand() * 0.03;
    sparks.va[i] = 0.04 + rand() * 0.12;
    sparks.age[i] = 0;
    sparks.life[i] = 0.5 + rand() * 1.1;
    sparks.size[i] = 0.014 + rand() * 0.03;
    sparks.seed[i] = rand() * 50;
  };
  const spawnTail = (i: number, env: EffectEnv) => {
    // sodium atoms pushed away from the Sun by radiation pressure
    const away = Math.atan2(-env.ly, -env.lx) + (rand() - 0.5) * 1.6;
    tail.a[i] = Math.cos(away) * (0.85 + rand() * 0.2);
    tail.b[i] = Math.sin(away) * (0.85 + rand() * 0.2);
    const sp = 0.22 + rand() * 0.35;
    const spread = (rand() - 0.5) * 0.16;
    tail.va[i] = -env.lx * sp - env.ly * spread;
    tail.vb[i] = -env.ly * sp + env.lx * spread;
    tail.age[i] = 0;
    tail.life[i] = 2 + rand() * 2.2;
    tail.size[i] = 0.03 + rand() * 0.05;
  };
  for (let i = 0; i < sparks.n; i++) sparks.age[i] = sparks.life[i] = 1;
  for (let i = 0; i < tail.n; i++) tail.age[i] = tail.life[i] = 1;
  return {
    live() {
      let n = 0;
      for (let i = 0; i < sparks.n; i++)
        if (sparks.age[i] < sparks.life[i]) n++;
      for (let i = 0; i < tail.n; i++) if (tail.age[i] < tail.life[i]) n++;
      return n + Math.round(dust.n);
    },
    update(env) {
      const dt = env.dt;
      for (let i = 0; i < dust.n; i++) dust.a[i] += dust.va[i] * dt;
      const ks = Math.round(sparks.n * env.amount);
      for (let i = 0; i < sparks.n; i++) {
        sparks.age[i] += dt;
        if (sparks.age[i] >= sparks.life[i]) {
          if (i < ks && rand() < dt * 3) spawnSpark(i, env);
          continue;
        }
        sparks.b[i] += sparks.va[i] * dt;
      }
      const kt = Math.round(tail.n * env.amount);
      for (let i = 0; i < tail.n; i++) {
        tail.age[i] += dt;
        if (tail.age[i] >= tail.life[i]) {
          if (i < kt && rand() < dt * 1.5) spawnTail(i, env);
          continue;
        }
        tail.a[i] += tail.va[i] * dt;
        tail.b[i] += tail.vb[i] * dt;
      }
      streak.age += dt;
      streak.next -= dt;
      if (streak.next <= 0 && env.amount > 0.6) {
        streak.next = 3 + rand() * 3.5;
        streak.age = 0;
        const side = rand() < 0.5 ? -1 : 1;
        streak.x = -2.4 * side;
        streak.y = -1.6 + rand() * 1.2;
        streak.vx = (2.2 + rand()) * side;
        streak.vy = 0.6 + rand() * 0.8;
      }
      if (streak.age < streak.life) {
        streak.x += streak.vx * dt;
        streak.y += streak.vy * dt;
      }
    },
    back(ctx, env) {
      const { x, y, r, amount } = env;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < tail.n; i++) {
        const q = tail.age[i] / tail.life[i];
        if (q >= 1) continue;
        const u = tail.a[i];
        const v = tail.b[i];
        if (u * u + v * v < 1) continue;
        soft(
          ctx,
          sodium,
          x + u * r,
          y + v * r,
          tail.size[i] * r * (1.4 + q * 1.6),
          0.1 * amount * lifeFade(q)
        );
      }
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < dust.n; i++) {
        plane(env, dust.b[i], dust.a[i], P);
        if (Math.sin(dust.a[i]) >= 0) continue;
        if (P[0] * P[0] + P[1] * P[1] < 1) continue;
        sprite(
          ctx,
          grit,
          x + P[0] * r,
          y + P[1] * r,
          Math.max(0.6, dust.size[i] * r),
          dust.seed[i] * amount * 0.8
        );
      }
      ctx.globalAlpha = 1;
    },
    front(ctx, env) {
      const { x, y, r, amount, t } = env;
      for (let i = 0; i < dust.n; i++) {
        if (Math.sin(dust.a[i]) < 0) continue;
        plane(env, dust.b[i], dust.a[i], P);
        sprite(
          ctx,
          grit,
          x + P[0] * r,
          y + P[1] * r,
          Math.max(0.6, dust.size[i] * r),
          dust.seed[i] * amount
        );
      }
      ctx.globalCompositeOperation = "lighter";
      // heat shimmer on the sunward limb
      const flick = 0.7 + 0.3 * Math.sin(t * 7.3) * Math.sin(t * 4.1 + 1);
      dayLimb(ctx, env, [255, 160, 90], 0.1, 0.16 * amount * flick, 1.1);
      for (let i = 0; i < sparks.n; i++) {
        const q = sparks.age[i] / sparks.life[i];
        if (q >= 1) continue;
        const d = sparks.b[i] * r;
        const f = 0.55 + 0.45 * Math.sin(sparks.age[i] * 34 + sparks.seed[i]);
        sprite(
          ctx,
          spark,
          x + Math.cos(sparks.a[i]) * d,
          y + Math.sin(sparks.a[i]) * d,
          sparks.size[i] * r,
          0.85 * amount * f * lifeFade(q)
        );
      }
      if (streak.age < streak.life) {
        const q = streak.age / streak.life;
        const hx = x + streak.x * r;
        const hy = y + streak.y * r;
        const len = Math.hypot(streak.vx, streak.vy);
        const tx = hx - (streak.vx / len) * r * 0.45;
        const ty = hy - (streak.vy / len) * r * 0.45;
        const g = ctx.createLinearGradient(hx, hy, tx, ty);
        g.addColorStop(
          0,
          `rgba(255,224,170,${(0.8 * (1 - q) * amount).toFixed(3)})`
        );
        g.addColorStop(1, "rgba(255,150,80,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(1, r * 0.018);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

/* ══════════════════════════════ VENUS ══════════════════════════════ */
function venusEffect(budget: number, rand: () => number): Effect {
  const haze = new Pool(Math.round(budget * 0.4));
  const glints = new Pool(Math.round(budget * 0.22));
  const cream = dot([246, 222, 170], 0.05);
  const glint = dot([255, 236, 170], 0.3);
  for (let i = 0; i < haze.n; i++) {
    haze.a[i] = rand() * TAU;
    haze.b[i] = 0.9 + rand() * 0.42;
    haze.va[i] = -(0.05 + rand() * 0.09);
    haze.size[i] = 0.16 + rand() * 0.3;
    haze.seed[i] = 0.05 + rand() * 0.09;
  }
  for (let i = 0; i < glints.n; i++) {
    glints.a[i] = rand() * TAU;
    glints.b[i] = 1.0 + rand() * 0.3;
    glints.va[i] = -(0.04 + rand() * 0.08);
    glints.size[i] = 0.012 + rand() * 0.02;
    glints.seed[i] = rand() * 40;
  }
  return {
    live: () => haze.n + glints.n,
    update(env) {
      for (let i = 0; i < haze.n; i++) haze.a[i] += haze.va[i] * env.dt;
      for (let i = 0; i < glints.n; i++) glints.a[i] += glints.va[i] * env.dt;
    },
    back(ctx, env) {
      const { x, y, r, amount } = env;
      ctx.globalCompositeOperation = "lighter";
      rimGlow(ctx, env, [255, 212, 150], 0.92, 1.5, 0.17 * amount, 1);
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < haze.n; i++) {
        if (Math.sin(haze.a[i]) >= 0) continue;
        plane(env, haze.b[i], haze.a[i], P);
        soft(
          ctx,
          cream,
          x + P[0] * r,
          y + P[1] * r,
          haze.size[i] * r,
          haze.seed[i] * amount
        );
      }
      ctx.globalAlpha = 1;
    },
    front(ctx, env) {
      const { x, y, r, amount, t } = env;
      for (let i = 0; i < haze.n; i++) {
        if (Math.sin(haze.a[i]) < 0) continue;
        plane(env, haze.b[i], haze.a[i], P);
        soft(
          ctx,
          cream,
          x + P[0] * r,
          y + P[1] * r,
          haze.size[i] * r,
          haze.seed[i] * amount * 0.8
        );
      }
      ctx.globalCompositeOperation = "lighter";
      dayLimb(ctx, env, [255, 226, 170], 0.06, 0.16 * amount, 1.3);
      for (let i = 0; i < glints.n; i++) {
        plane(env, glints.b[i], glints.a[i], P);
        if (Math.sin(glints.a[i]) < 0 && P[0] * P[0] + P[1] * P[1] < 1)
          continue;
        const f = Math.max(0, Math.sin(t * 2.3 + glints.seed[i]));
        sprite(
          ctx,
          glint,
          x + P[0] * r,
          y + P[1] * r,
          glints.size[i] * r,
          0.55 * amount * f * f
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

/* ══════════════════════════════ EARTH ══════════════════════════════ */
function earthEffect(budget: number, rand: () => number): Effect {
  const air = new Pool(Math.round(budget * 0.45));
  const water = new Pool(Math.round(budget * 0.35));
  const mote = dot([214, 236, 255], 0.3);
  const drop = dot([120, 190, 255], 0.35);
  for (let i = 0; i < air.n; i++) {
    air.a[i] = rand() * TAU;
    air.b[i] = 1.03 + rand() * 0.22;
    air.va[i] = 0.03 + rand() * 0.08;
    air.size[i] = 0.008 + rand() * 0.012;
    air.seed[i] = rand() * TAU;
  }
  const spawnDrop = (i: number) => {
    water.a[i] = rand() * TAU;
    water.b[i] = 1.0;
    water.va[i] = 0.02 + rand() * 0.05;
    water.age[i] = 0;
    water.life[i] = 3 + rand() * 3;
    water.size[i] = 0.01 + rand() * 0.016;
  };
  for (let i = 0; i < water.n; i++) {
    spawnDrop(i);
    water.age[i] = rand() * water.life[i];
  }
  return {
    live: () => air.n + water.n,
    update(env) {
      const dt = env.dt;
      for (let i = 0; i < air.n; i++) air.a[i] += air.va[i] * dt;
      for (let i = 0; i < water.n; i++) {
        water.age[i] += dt;
        if (water.age[i] >= water.life[i]) spawnDrop(i);
        water.b[i] += water.va[i] * dt;
      }
    },
    back(ctx, env) {
      ctx.globalCompositeOperation = "lighter";
      rimGlow(ctx, env, [90, 160, 255], 0.94, 1.42, 0.42 * env.amount, 1);
      ctx.globalCompositeOperation = "source-over";
    },
    front(ctx, env) {
      const { x, y, r, amount, t } = env;
      ctx.globalCompositeOperation = "lighter";
      dayLimb(ctx, env, [150, 205, 255], 0.05, 0.42 * amount, 1.35);
      for (let i = 0; i < air.n; i++) {
        plane(
          env,
          air.b[i] + 0.03 * Math.sin(t * 0.8 + air.seed[i]),
          air.a[i],
          P
        );
        if (Math.sin(air.a[i]) < 0 && P[0] * P[0] + P[1] * P[1] < 1) continue;
        sprite(
          ctx,
          mote,
          x + P[0] * r,
          y + P[1] * r,
          Math.max(0.5, air.size[i] * r),
          0.32 * amount
        );
      }
      for (let i = 0; i < water.n; i++) {
        const q = water.age[i] / water.life[i];
        const d = water.b[i] * r;
        const px = Math.cos(water.a[i]);
        const py = Math.sin(water.a[i]);
        sprite(
          ctx,
          drop,
          x + px * d,
          y + py * d,
          Math.max(0.5, water.size[i] * r),
          0.38 * amount * lifeFade(q) * (0.4 + 0.6 * lit(env, px, py, 0))
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

/* ══════════════════════════════ MARS ═══════════════════════════════ */
function marsEffect(budget: number, rand: () => number): Effect {
  const dust = new Pool(Math.round(budget * 0.66));
  const rocks = new Pool(Math.max(6, Math.round(budget * 0.08)));
  const wave = { age: 99, life: 3.6, next: 3 + rand() * 4 };
  const red = dot([206, 108, 62], 0.2);
  const pale = dot([236, 160, 110], 0.15);
  const spawnDust = (i: number, from: number) => {
    dust.a[i] = from; // x, across the wind
    dust.b[i] = (rand() - 0.5) * 2.5; // y
    dust.c[i] = rand() < 0.5 ? -1 : 1; // behind / in front of the planet
    dust.va[i] = 0.16 + rand() * 0.32;
    dust.size[i] = 0.01 + rand() * 0.028;
    dust.seed[i] = rand() * TAU;
    dust.age[i] = 0;
  };
  for (let i = 0; i < dust.n; i++) spawnDust(i, -1.7 + rand() * 3.4);
  for (let i = 0; i < rocks.n; i++) {
    rocks.a[i] = rand() * TAU;
    rocks.b[i] = 1.2 + rand() * 0.6;
    rocks.va[i] = (rand() - 0.5) * 0.12;
    rocks.size[i] = 0.6 + rand() * 1.1;
  }
  const wind = (env: EffectEnv, u: number, v: number) => {
    // the wind runs along the equator; dust drifts across the face
    const c = Math.cos(env.rho);
    const s = Math.sin(env.rho);
    P[0] = u * c - v * s;
    P[1] = u * s + v * c;
  };
  return {
    live() {
      return dust.n + rocks.n;
    },
    dustFront() {
      if (wave.age >= wave.life) return null;
      const q = wave.age / wave.life;
      return { at: -1 + q * 2, amount: Math.sin(q * Math.PI) * 0.55 };
    },
    update(env) {
      const dt = env.dt;
      const gust =
        wave.age < wave.life
          ? 1 + 1.6 * Math.sin((wave.age / wave.life) * Math.PI)
          : 1;
      for (let i = 0; i < dust.n; i++) {
        dust.a[i] += dust.va[i] * dt * gust;
        dust.b[i] += Math.sin(env.t * 0.9 + dust.seed[i]) * 0.04 * dt;
        if (dust.a[i] > 1.7) spawnDust(i, -1.7);
      }
      for (let i = 0; i < rocks.n; i++) rocks.a[i] += rocks.va[i] * dt;
      wave.age += dt;
      wave.next -= dt;
      if (wave.next <= 0 && env.amount > 0.6) {
        wave.next = 7 + rand() * 5;
        wave.age = 0;
      }
    },
    back(ctx, env) {
      const { x, y, r, amount } = env;
      ctx.globalCompositeOperation = "lighter";
      rimGlow(ctx, env, [230, 130, 80], 0.95, 1.28, 0.14 * amount, 1);
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < dust.n; i++) {
        if (dust.c[i] > 0) continue;
        const u = dust.a[i];
        const v = dust.b[i];
        if (u * u + v * v < 1.02) continue;
        wind(env, u, v);
        const edge = 1 - smooth(1.2, 1.7, Math.abs(u));
        sprite(
          ctx,
          red,
          x + P[0] * r,
          y + P[1] * r,
          dust.size[i] * r * 1.4,
          0.3 * amount * edge
        );
      }
      ctx.globalAlpha = 1;
    },
    front(ctx, env) {
      const { x, y, r, amount } = env;
      const storm =
        wave.age < wave.life ? Math.sin((wave.age / wave.life) * Math.PI) : 0;
      for (let i = 0; i < dust.n; i++) {
        if (dust.c[i] < 0) continue;
        const u = dust.a[i];
        const v = dust.b[i];
        wind(env, u, v);
        const edge = 1 - smooth(1.2, 1.7, Math.abs(u));
        const onDisk = u * u + v * v < 1;
        (onDisk ? soft : sprite)(
          ctx,
          onDisk ? pale : red,
          x + P[0] * r,
          y + P[1] * r,
          dust.size[i] * r * (onDisk ? 3.2 : 1.3),
          (onDisk ? 0.06 + 0.12 * storm : 0.32) * amount * edge
        );
      }
      ctx.globalAlpha = 0.55 * amount;
      ctx.fillStyle = "#3a2a22";
      for (let i = 0; i < rocks.n; i++) {
        plane(env, rocks.b[i], rocks.a[i], P);
        const s = rocks.size[i];
        ctx.fillRect(x + P[0] * r - s / 2, y + P[1] * r - s / 2, s, s * 0.8);
      }
      ctx.globalAlpha = 1;
    },
  };
}

/* ═════════════════════════════ JUPITER ═════════════════════════════ */
function jupiterEffect(budget: number, rand: () => number): Effect {
  const storms = new Pool(Math.round(budget * 0.5));
  const swirl = new Pool(Math.round(budget * 0.14));
  const bolt = {
    age: 99,
    life: 0.22,
    lam: 0,
    phi: 0,
    next: 1 + rand() * 2,
    twin: 0,
  };
  const boltPath = new Float32Array(12);
  const speck = dot([255, 246, 230], 0.35);
  const warm = dot([255, 190, 160], 0.3);
  const flash = dot([200, 220, 255], 0.2);
  const jet = (phi: number) => 0.06 * Math.sin(phi * 9.5 + 0.5);
  const spawnStorm = (i: number, edge: boolean) => {
    storms.a[i] = edge ? -Math.PI / 2 : (rand() - 0.5) * Math.PI;
    storms.b[i] = (rand() - 0.5) * 2.4;
    storms.size[i] = 0.006 + rand() * 0.012;
    storms.seed[i] = 0.12 + rand() * 0.3;
  };
  for (let i = 0; i < storms.n; i++) spawnStorm(i, false);
  for (let i = 0; i < swirl.n; i++) {
    swirl.a[i] = rand() * TAU;
    swirl.b[i] = 0.25 + rand() * 0.75;
    swirl.va[i] = 0.9 + rand() * 0.7;
    swirl.size[i] = 0.008 + rand() * 0.012;
  }
  return {
    live: () => storms.n + swirl.n,
    update(env) {
      const dt = env.dt;
      for (let i = 0; i < storms.n; i++) {
        storms.a[i] += (0.16 + jet(storms.b[i])) * dt;
        if (storms.a[i] > Math.PI / 2) spawnStorm(i, true);
      }
      for (let i = 0; i < swirl.n; i++) swirl.a[i] += swirl.va[i] * dt;
      bolt.age += dt;
      bolt.next -= dt;
      if (bolt.next <= 0 && env.amount > 0.6) {
        // occasional, never continuous: one strike every ~1.5–4.5 s
        bolt.next = 1.5 + rand() * 3;
        bolt.age = 0;
        bolt.twin = rand() < 0.35 ? 0.09 : 0;
        bolt.lam = (rand() - 0.5) * 2.4;
        bolt.phi = (rand() - 0.5) * 1.6;
        let u = 0;
        let v = 0;
        for (let k = 0; k < 6; k++) {
          u += (rand() - 0.5) * 0.09;
          v += 0.02 + rand() * 0.05;
          boltPath[k * 2] = u;
          boltPath[k * 2 + 1] = v;
        }
      }
    },
    back() {},
    front(ctx, env) {
      const { x, y, r, amount } = env;
      ctx.globalCompositeOperation = "lighter";
      rimGlow(ctx, env, [255, 214, 170], 0.97, 1.16, 0.12 * amount, 1);
      // storm motes riding the bands, on the sunlit face
      for (let i = 0; i < storms.n; i++) {
        const lam = storms.a[i];
        const phi = storms.b[i] * 0.55;
        onSphere(env, lam, phi, P);
        if (P[2] <= 0.05) continue;
        const day = lit(env, P[0], P[1], P[2]);
        sprite(
          ctx,
          speck,
          x + P[0] * r,
          y + P[1] * r,
          Math.max(0.5, storms.size[i] * r),
          storms.seed[i] * amount * day * Math.sqrt(P[2])
        );
      }
      // the Great Red Spot's swirl
      const s = env.spot;
      if (s && Math.cos(s.lam) > 0.05) {
        for (let i = 0; i < swirl.n; i++) {
          const lam = s.lam + Math.cos(swirl.a[i]) * swirl.b[i] * 0.28;
          const phi = s.phi + Math.sin(swirl.a[i]) * swirl.b[i] * 0.09;
          onSphere(env, lam, phi, P);
          if (P[2] <= 0.05) continue;
          sprite(
            ctx,
            warm,
            x + P[0] * r,
            y + P[1] * r,
            Math.max(0.5, swirl.size[i] * r),
            0.22 * amount * Math.sqrt(P[2])
          );
        }
      }
      // lightning in the clouds: a flash and a fine branching bolt
      if (bolt.age < bolt.life) {
        onSphere(env, bolt.lam, bolt.phi, P);
        if (P[2] > 0.1) {
          const q = bolt.age / bolt.life;
          const on = bolt.twin && q > 0.35 && q < 0.5 ? 0.25 : 1;
          const k = Math.exp(-q * 5) * on * amount;
          const bx = x + P[0] * r;
          const by = y + P[1] * r;
          soft(ctx, flash, bx, by, r * 0.2, 0.75 * k);
          soft(ctx, flash, bx, by, r * 0.07, 0.9 * k);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = `rgba(225,235,255,${(0.32 * k).toFixed(3)})`;
          ctx.lineWidth = Math.max(0.5, r * 0.004);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          for (let j = 0; j < 6; j++)
            ctx.lineTo(bx + boltPath[j * 2] * r, by + boltPath[j * 2 + 1] * r);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

/* ═════════════════════════════ SATURN ══════════════════════════════ */
function saturnEffect(
  budget: number,
  rand: () => number,
  inner: number,
  outer: number
): Effect {
  const ring = new Pool(Math.round(budget * 0.76));
  const ice = new Pool(Math.round(budget * 0.12));
  const gold = dot([240, 226, 190], 0.4);
  const frost = dot([214, 232, 255], 0.35);
  const span = outer - inner;
  for (let i = 0; i < ring.n; i++) {
    let f = rand();
    // keep the Cassini division clear
    if (f > 0.73 && f < 0.79) f = rand() < 0.5 ? 0.7 : 0.82;
    ring.b[i] = inner + span * f;
    ring.a[i] = rand() * TAU;
    ring.va[i] = 0.55 / Math.pow(ring.b[i], 1.5);
    ring.size[i] = 0.005 + rand() * 0.01;
    ring.seed[i] = rand() < 0.2 ? rand() * TAU + 10 : rand() * 0.4 + 0.25;
  }
  for (let i = 0; i < ice.n; i++) {
    ice.b[i] = inner + span * (0.1 + rand() * 0.85);
    ice.a[i] = rand() * TAU;
    ice.va[i] = 0.45 / Math.pow(ice.b[i], 1.5);
    ice.size[i] = 0.016 + rand() * 0.018;
    ice.seed[i] = rand() * TAU;
  }
  const draw = (
    ctx: CanvasRenderingContext2D,
    env: EffectEnv,
    front: boolean
  ) => {
    const { x, y, r, amount, t } = env;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < ring.n; i++) {
      const sf = Math.sin(ring.a[i]) >= 0;
      if (sf !== front) continue;
      plane(env, ring.b[i], ring.a[i], P);
      if (!front && P[0] * P[0] + P[1] * P[1] < 1) continue;
      const sd = ring.seed[i];
      // most grains glow steadily; one in five catches the light and sparkles
      const a =
        sd >= 10
          ? 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.1 + sd), 10)
          : sd;
      sprite(
        ctx,
        gold,
        x + P[0] * r,
        y + P[1] * r,
        Math.max(0.5, ring.size[i] * r),
        a * amount * (front ? 1 : 0.7)
      );
    }
    for (let i = 0; i < ice.n; i++) {
      const sf = Math.sin(ice.a[i]) >= 0;
      if (sf !== front) continue;
      plane(env, ice.b[i], ice.a[i], P);
      if (!front && P[0] * P[0] + P[1] * P[1] < 1) continue;
      const tumble = 0.7 + 0.3 * Math.sin(t * 2 + ice.seed[i]);
      sprite(
        ctx,
        frost,
        x + P[0] * r,
        y + P[1] * r,
        ice.size[i] * r * tumble,
        0.55 * amount
      );
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };
  return {
    live: () => ring.n + ice.n,
    update(env) {
      for (let i = 0; i < ring.n; i++) ring.a[i] += ring.va[i] * env.dt;
      for (let i = 0; i < ice.n; i++) ice.a[i] += ice.va[i] * env.dt;
    },
    back: (ctx, env) => draw(ctx, env, false),
    front: (ctx, env) => draw(ctx, env, true),
  };
}

/* ═════════════════════════════ URANUS ══════════════════════════════ */
function uranusEffect(budget: number, rand: () => number): Effect {
  const wind = new Pool(Math.round(budget * 0.58));
  const ice = new Pool(Math.round(budget * 0.3));
  const crystal = dot([226, 250, 255], 0.35);
  for (let i = 0; i < wind.n; i++) {
    wind.a[i] = rand() * TAU;
    wind.b[i] = 1.05 + rand() * 0.55;
    wind.va[i] = 0.32 + rand() * 0.42;
    wind.seed[i] = rand() * TAU;
  }
  for (let i = 0; i < ice.n; i++) {
    ice.a[i] = (rand() - 0.5) * 4;
    ice.b[i] = (rand() - 0.5) * 4;
    ice.va[i] = (rand() - 0.5) * 0.05;
    ice.vb[i] = (rand() - 0.5) * 0.05;
    ice.size[i] = 0.008 + rand() * 0.014;
    ice.seed[i] = rand() * TAU;
  }
  const streaks = (
    ctx: CanvasRenderingContext2D,
    env: EffectEnv,
    front: boolean
  ) => {
    const { x, y, r, amount } = env;
    ctx.beginPath();
    for (let i = 0; i < wind.n; i++) {
      const sf = Math.sin(wind.a[i]) >= 0;
      if (sf !== front) continue;
      const rad = wind.b[i] + 0.04 * Math.sin(env.t * 0.7 + wind.seed[i]);
      plane(env, rad, wind.a[i], P);
      const hx = P[0];
      const hy = P[1];
      plane(env, rad, wind.a[i] - 0.22, P);
      if (!front && (hx * hx + hy * hy < 1 || P[0] * P[0] + P[1] * P[1] < 1))
        continue;
      ctx.moveTo(x + P[0] * r, y + P[1] * r);
      ctx.lineTo(x + hx * r, y + hy * r);
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.5, r * 0.007);
    ctx.strokeStyle = `rgba(170,238,246,${((front ? 0.2 : 0.11) * amount).toFixed(3)})`;
    ctx.stroke();
  };
  return {
    live: () => wind.n + ice.n,
    update(env) {
      const dt = env.dt;
      for (let i = 0; i < wind.n; i++) wind.a[i] += wind.va[i] * dt;
      for (let i = 0; i < ice.n; i++) {
        ice.a[i] += ice.va[i] * dt;
        ice.b[i] += ice.vb[i] * dt;
        if (Math.abs(ice.a[i]) > 2.1) ice.va[i] = -ice.va[i];
        if (Math.abs(ice.b[i]) > 2.1) ice.vb[i] = -ice.vb[i];
      }
    },
    back(ctx, env) {
      ctx.globalCompositeOperation = "lighter";
      rimGlow(ctx, env, [150, 230, 240], 0.95, 1.45, 0.3 * env.amount, 1);
      streaks(ctx, env, false);
      ctx.globalCompositeOperation = "source-over";
    },
    front(ctx, env) {
      const { x, y, r, amount, t } = env;
      ctx.globalCompositeOperation = "lighter";
      streaks(ctx, env, true);
      for (let i = 0; i < ice.n; i++) {
        const u = ice.a[i];
        const v = ice.b[i];
        if (u * u + v * v < 1.1) continue;
        const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.7 + ice.seed[i]));
        sprite(
          ctx,
          crystal,
          x + u * r,
          y + v * r,
          Math.max(0.5, ice.size[i] * r),
          0.45 * amount * tw
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

/* ═════════════════════════════ NEPTUNE ═════════════════════════════ */
function neptuneEffect(budget: number, rand: () => number): Effect {
  const STREAMS = [
    { R: 1.14, amp: 0.05, k: 3, w: 1.3, om: 0.95, col: [110, 180, 255] as RGB },
    { R: 1.34, amp: 0.08, k: 5, w: -0.9, om: 0.72, col: [80, 140, 255] as RGB },
    { R: 1.58, amp: 0.06, k: 4, w: 1.7, om: 1.1, col: [170, 222, 255] as RGB },
  ];
  const flow = new Pool(Math.round(budget * 0.66));
  const mist = new Pool(Math.round(budget * 0.08));
  const vort = new Pool(Math.round(budget * 0.1));
  const droplet = dot([200, 232, 255], 0.35);
  const fog = dot([80, 130, 230], 0.05);
  const deep = dot([150, 190, 255], 0.3);
  for (let i = 0; i < flow.n; i++) {
    flow.c[i] = i % 3;
    flow.a[i] = rand() * TAU;
    flow.seed[i] = (rand() - 0.5) * 0.06;
    flow.va[i] = 0.85 + rand() * 0.3;
  }
  for (let i = 0; i < mist.n; i++) {
    mist.a[i] = rand() * TAU;
    mist.b[i] = 1.1 + rand() * 0.5;
    mist.va[i] = 0.05 + rand() * 0.06;
    mist.size[i] = 0.25 + rand() * 0.3;
  }
  for (let i = 0; i < vort.n; i++) {
    vort.a[i] = rand() * TAU;
    vort.b[i] = 0.2 + rand() * 0.8;
    vort.va[i] = 1.1 + rand() * 0.9;
    vort.size[i] = 0.008 + rand() * 0.01;
  }
  const radius = (
    s: (typeof STREAMS)[number],
    th: number,
    t: number,
    j: number
  ) => s.R + s.amp * Math.sin(s.k * th + s.w * t) + j;

  const ribbons = (
    ctx: CanvasRenderingContext2D,
    env: EffectEnv,
    front: boolean
  ) => {
    const { x, y, r, amount, t } = env;
    for (let k = 0; k < 3; k++) {
      const s = STREAMS[k];
      ctx.beginPath();
      for (let i = 0; i < flow.n; i++) {
        if (flow.c[i] !== k) continue;
        const th = flow.a[i];
        if (Math.sin(th) >= 0 !== front) continue;
        plane(env, radius(s, th, t, flow.seed[i]), th, P);
        const hx = P[0];
        const hy = P[1];
        const th2 = th - 0.16;
        plane(env, radius(s, th2, t, flow.seed[i]), th2, P);
        if (!front && (hx * hx + hy * hy < 1 || P[0] * P[0] + P[1] * P[1] < 1))
          continue;
        ctx.moveTo(x + P[0] * r, y + P[1] * r);
        ctx.lineTo(x + hx * r, y + hy * r);
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.6, r * 0.014);
      ctx.strokeStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${((front ? 0.42 : 0.22) * amount).toFixed(3)})`;
      ctx.stroke();
    }
    // wave-like arcs rippling around the planet
    for (let k = 0; k < 3; k++) {
      const base = 1.22 + k * 0.2;
      ctx.beginPath();
      let started = false;
      for (let j = 0; j <= 48; j++) {
        const th = (front ? 0 : Math.PI) + (j / 48) * Math.PI;
        const rad =
          base + 0.035 * Math.sin(6 * th + t * (1.4 + k * 0.5) + k * 2);
        plane(env, rad, th + t * 0.05 * (k + 1), P);
        if (!front && P[0] * P[0] + P[1] * P[1] < 1) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(x + P[0] * r, y + P[1] * r);
          started = true;
        } else ctx.lineTo(x + P[0] * r, y + P[1] * r);
      }
      ctx.lineWidth = Math.max(0.5, r * 0.006);
      ctx.strokeStyle = `rgba(140,200,255,${((front ? 0.3 : 0.15) * amount).toFixed(3)})`;
      ctx.stroke();
    }
    // bright droplet heads on some of the flow
    for (let i = 0; i < flow.n; i += 3) {
      const th = flow.a[i];
      if (Math.sin(th) >= 0 !== front) continue;
      plane(env, radius(STREAMS[flow.c[i]], th, t, flow.seed[i]), th, P);
      if (!front && P[0] * P[0] + P[1] * P[1] < 1) continue;
      sprite(
        ctx,
        droplet,
        x + P[0] * r,
        y + P[1] * r,
        Math.max(0.6, r * 0.016),
        (front ? 0.7 : 0.35) * amount
      );
    }
  };

  return {
    live: () => flow.n + mist.n + vort.n,
    update(env) {
      const dt = env.dt;
      for (let i = 0; i < flow.n; i++)
        flow.a[i] += STREAMS[flow.c[i]].om * flow.va[i] * dt;
      for (let i = 0; i < mist.n; i++) mist.a[i] += mist.va[i] * dt;
      for (let i = 0; i < vort.n; i++) {
        vort.a[i] += vort.va[i] * dt;
        vort.b[i] -= 0.08 * dt;
        if (vort.b[i] < 0.15) vort.b[i] = 1;
      }
    },
    back(ctx, env) {
      const { x, y, r, amount } = env;
      ctx.globalCompositeOperation = "lighter";
      rimGlow(ctx, env, [60, 110, 255], 0.95, 1.7, 0.36 * amount, 0.6);
      for (let i = 0; i < mist.n; i++) {
        plane(env, mist.b[i], mist.a[i], P);
        soft(
          ctx,
          fog,
          x + P[0] * r,
          y + P[1] * r,
          mist.size[i] * r,
          0.09 * amount
        );
      }
      ribbons(ctx, env, false);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
    front(ctx, env) {
      const { x, y, r, amount } = env;
      ctx.globalCompositeOperation = "lighter";
      dayLimb(ctx, env, [120, 180, 255], 0.05, 0.36 * amount, 1.3);
      ribbons(ctx, env, true);
      // the Great Dark Spot's vortex
      const s = env.spot;
      if (s && Math.cos(s.lam) > 0.05) {
        for (let i = 0; i < vort.n; i++) {
          const lam = s.lam + Math.cos(vort.a[i]) * vort.b[i] * 0.26;
          const phi = s.phi + Math.sin(vort.a[i]) * vort.b[i] * 0.085;
          onSphere(env, lam, phi, P);
          if (P[2] <= 0.05) continue;
          sprite(
            ctx,
            deep,
            x + P[0] * r,
            y + P[1] * r,
            Math.max(0.5, vort.size[i] * r),
            0.5 * amount * Math.sqrt(P[2])
          );
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

/** the effect for a body, sized to a particle budget (desktop ~300, phones ~100) */
export function createEffect(
  id: string,
  budget: number,
  rings?: { inner: number; outer: number }
): Effect | null {
  const rand = mulberry32(
    Array.from(id).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)
  );
  switch (id) {
    case "sun":
      return sunEffect(budget, rand);
    case "mercury":
      return mercuryEffect(budget, rand);
    case "venus":
      return venusEffect(budget, rand);
    case "earth":
      return earthEffect(budget, rand);
    case "mars":
      return marsEffect(budget, rand);
    case "jupiter":
      return jupiterEffect(budget, rand);
    case "saturn":
      return saturnEffect(
        budget,
        rand,
        rings?.inner ?? 1.24,
        rings?.outer ?? 2.2
      );
    case "uranus":
      return uranusEffect(budget, rand);
    case "neptune":
      return neptuneEffect(budget, rand);
    default:
      return null;
  }
}
