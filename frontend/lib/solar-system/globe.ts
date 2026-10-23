import type { MapData } from "./textures";

/**
 * Per-pixel rotating globe for the focused body. A lookup table (built once
 * per size) gives every pixel of the disk its longitude, latitude and
 * surface normal; each frame the map is sampled at the current rotation and
 * the pixel is lit from the Sun's real direction. That lets the planet
 * actually turn, cloud layers drift on their own, latitude bands run at
 * different speeds, vortices swirl, oceans catch the light and dust fronts
 * sweep across, at the cost of one pass over ~10–50k pixels.
 *
 * Unfocused bodies never come here: they keep their static sprites.
 */

export type GlobeLut = {
  D: number;
  n: number;
  /** byte offset of each disk pixel in the D×D RGBA output */
  out: Uint32Array;
  /** longitude as a fraction of a turn, -0.5..0.5 (0 = facing us) */
  lon: Float32Array;
  /** latitude as a map row fraction, 0 = north pole … 1 = south pole */
  row: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  /** anti-aliased edge coverage, 0..255 */
  cover: Uint8Array;
};

export function makeLut(D: number): GlobeLut {
  const R = D / 2;
  const cap = D * D;
  const out = new Uint32Array(cap);
  const lon = new Float32Array(cap);
  const row = new Float32Array(cap);
  const nx = new Float32Array(cap);
  const ny = new Float32Array(cap);
  const nz = new Float32Array(cap);
  const cover = new Uint8Array(cap);
  let n = 0;
  for (let j = 0; j < D; j++) {
    for (let i = 0; i < D; i++) {
      const u = (i + 0.5 - R) / R;
      const v = (j + 0.5 - R) / R;
      const d = Math.sqrt(u * u + v * v);
      const c = Math.min(1, Math.max(0, (1 - d) * R + 0.5));
      if (c <= 0) continue;
      // pixels on the anti-aliased rim sample the limb itself
      const k = d > 0.999 ? 0.999 / d : 1;
      const x = u * k;
      const y = -v * k;
      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      out[n] = (j * D + i) * 4;
      lon[n] = Math.atan2(x, z) / (Math.PI * 2);
      row[n] = 0.5 - Math.asin(y) / Math.PI;
      nx[n] = x;
      ny[n] = y;
      nz[n] = z;
      cover[n] = Math.round(c * 255);
      n++;
    }
  }
  // keep only the disk (the corners of the square are never sampled)
  return {
    D,
    n,
    out: out.slice(0, n),
    lon: lon.slice(0, n),
    row: row.slice(0, n),
    nx: nx.slice(0, n),
    ny: ny.slice(0, n),
    nz: nz.slice(0, n),
    cover: cover.slice(0, n),
  };
}

export type GlobeLayer = {
  map: MapData;
  /** rotation, as a fraction of a turn */
  shift: number;
  /** extra shift per map row (latitude bands moving at their own speed) */
  bands?: Float32Array | null;
};

export type Vortex = {
  /** centre and half-size in map fractions */
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** the two flow-map phases (radians) and their blend */
  a1: number;
  a2: number;
  blend: number;
};

export type GlobeStyle = {
  kind: "lit" | "sun";
  ambient: number;
  /** limb darkening strength */
  limb: number;
  /** ocean glint strength (uses the base map's alpha as the ocean mask) */
  specular: number;
  cloudOpacity: number;
  vortex: Vortex | null;
  /** a dust front sweeping across longitudes (Mars) */
  dust: { at: number; width: number; amount: number } | null;
};

/** light direction in the globe's own frame (x right, y up, z toward us) */
export type Light = { x: number; y: number; z: number };

const SUN_PALETTE = (() => {
  // colour by depth into the disk: warm white-gold centre, gold, then a
  // deep orange-red limb (limb darkening)
  const p = new Float32Array(65 * 3);
  const centre = [255, 222, 132];
  const mid = [255, 162, 46];
  const edge = [196, 56, 10];
  for (let i = 0; i <= 64; i++) {
    const mu = i / 64;
    const t = Math.sqrt(mu);
    const t3 = t * t * t;
    const inner = [0, 1, 2].map((c) => mid[c] + (centre[c] - mid[c]) * t3);
    const dark = 0.55 + 0.45 * t;
    for (let c = 0; c < 3; c++)
      p[i * 3 + c] = (edge[c] + (inner[c] - edge[c]) * t) * dark;
  }
  return p;
})();

/**
 * Renders one frame of the globe into `img` (D×D, disk pixels only; the
 * corners are never touched, so they stay transparent).
 */
export function renderGlobe(
  img: ImageData,
  lut: GlobeLut,
  base: GlobeLayer,
  clouds: GlobeLayer | null,
  style: GlobeStyle,
  light: Light
) {
  const data = img.data;
  const bm = base.map.rgba;
  const bw = base.map.w;
  const bh = base.map.h;
  const bands = base.bands ?? null;
  const shift = base.shift;
  const cm = clouds ? clouds.map.rgba : null;
  const cw = clouds ? clouds.map.w : 0;
  const ch = clouds ? clouds.map.h : 0;
  const cshift = clouds ? clouds.shift : 0;
  const cop = style.cloudOpacity;
  const sun = style.kind === "sun";
  const amb = style.ambient;
  const limb = style.limb;
  const spec = style.specular;
  const vx = style.vortex;
  const dust = style.dust;
  const { lon, row, nx, ny, nz, out, cover } = lut;
  const Lx = light.x;
  const Ly = light.y;
  const Lz = light.z;
  // half vector between the light and the viewer, for ocean glints
  let Hx = Lx;
  let Hy = Ly;
  let Hz = Lz + 1;
  const hl = Math.hypot(Hx, Hy, Hz) || 1;
  Hx /= hl;
  Hy /= hl;
  Hz /= hl;

  for (let p = 0; p < lut.n; p++) {
    const rf = row[p];
    let ry = (rf * bh) | 0;
    if (ry >= bh) ry = bh - 1;
    let fx = lon[p] + 0.5 - shift - (bands ? bands[ry] : 0);

    let r: number;
    let g: number;
    let b: number;
    let swirled = false;
    if (vx) {
      let dx = fx - vx.x;
      dx -= Math.round(dx);
      const ex = dx / vx.rx;
      const ey = (rf - vx.y) / vx.ry;
      const e2 = ex * ex + ey * ey;
      if (e2 < 1) {
        // flow-map swirl: two phases of the same rotation, cross-faded, so
        // the vortex keeps turning without winding itself up
        const w = (1 - e2) * (1 - e2);
        let k1: number;
        let k2: number;
        {
          const a = vx.a1 * w;
          const c = Math.cos(a);
          const s = Math.sin(a);
          let sx = vx.x + (ex * c - ey * s) * vx.rx;
          const sy = vx.y + (ex * s + ey * c) * vx.ry;
          sx -= Math.floor(sx);
          let yy = (sy * bh) | 0;
          if (yy < 0) yy = 0;
          else if (yy >= bh) yy = bh - 1;
          k1 = (yy * bw + ((sx * bw) | 0)) << 2;
        }
        {
          const a = vx.a2 * w;
          const c = Math.cos(a);
          const s = Math.sin(a);
          let sx = vx.x + (ex * c - ey * s) * vx.rx;
          const sy = vx.y + (ex * s + ey * c) * vx.ry;
          sx -= Math.floor(sx);
          let yy = (sy * bh) | 0;
          if (yy < 0) yy = 0;
          else if (yy >= bh) yy = bh - 1;
          k2 = (yy * bw + ((sx * bw) | 0)) << 2;
        }
        const t = vx.blend;
        r = bm[k1] + (bm[k2] - bm[k1]) * t;
        g = bm[k1 + 1] + (bm[k2 + 1] - bm[k1 + 1]) * t;
        b = bm[k1 + 2] + (bm[k2 + 2] - bm[k1 + 2]) * t;
        swirled = true;
      }
    }
    fx -= Math.floor(fx);
    const k = (ry * bw + ((fx * bw) | 0)) << 2;
    if (!swirled) {
      r = bm[k];
      g = bm[k + 1];
      b = bm[k + 2];
    }
    const z = nz[p];
    const o = out[p];

    if (sun) {
      // granulation: the map, plus a counter-rotating copy (in `clouds`)
      let gr = r!;
      if (cm) {
        let cx = lon[p] + 0.5 - cshift;
        cx -= Math.floor(cx);
        let cy = (rf * ch) | 0;
        if (cy >= ch) cy = ch - 1;
        gr = (gr + cm[(cy * cw + ((cx * cw) | 0)) << 2]) * 0.5;
      }
      // granulation: bright cells, darker lanes between them
      const br = 0.97 + 0.36 * (gr / 255 - 0.5);
      const pi = ((z * 64) | 0) * 3;
      data[o] = SUN_PALETTE[pi] * br;
      data[o + 1] = SUN_PALETTE[pi + 1] * br;
      data[o + 2] = SUN_PALETTE[pi + 2] * br;
      data[o + 3] = cover[p];
      continue;
    }

    if (dust) {
      let dd = fx - dust.at;
      dd -= Math.round(dd);
      const q = dd / dust.width;
      const d = dust.amount * Math.exp(-q * q) * (0.55 + 0.45 * (g! / 255));
      if (d > 0.004) {
        r = r! + (214 - r!) * d;
        g = g! + (128 - g!) * d;
        b = b! + (74 - b!) * d;
      }
    }

    let ca = 0;
    if (cm) {
      let cx = lon[p] + 0.5 - cshift;
      cx -= Math.floor(cx);
      let cy = (rf * ch) | 0;
      if (cy >= ch) cy = ch - 1;
      const ck = (cy * cw + ((cx * cw) | 0)) << 2;
      ca = (cm[ck + 3] / 255) * cop;
      r = r! + (cm[ck] - r!) * ca;
      g = g! + (cm[ck + 1] - g!) * ca;
      b = b! + (cm[ck + 2] - b!) * ca;
    }

    const x = nx[p];
    const y = ny[p];
    const ndl = x * Lx + y * Ly + z * Lz;
    // soft terminator: light wraps a little past the edge of the day side
    let w = (ndl + 0.14) / 1.14;
    if (w < 0) w = 0;
    let shade = amb + (1 - amb) * w * Math.sqrt(w);
    if (limb) {
      const e = 1 - z;
      shade *= 1 - limb * e * e;
    }
    r = r! * shade;
    g = g! * shade;
    b = b! * shade;
    if (spec && ndl > 0 && !swirled) {
      const mask = (bm[k + 3] / 255) * (1 - ca);
      if (mask > 0) {
        let s = x * Hx + y * Hy + z * Hz;
        if (s > 0) {
          s *= s;
          s *= s;
          s *= s;
          s *= s;
          s *= s;
          const add = s * spec * mask * 255;
          r += add;
          g += add * 0.95;
          b += add * 0.86;
        }
      }
    }
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = cover[p];
  }
}
