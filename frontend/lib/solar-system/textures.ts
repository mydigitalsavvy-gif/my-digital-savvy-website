import type { SurfaceId } from "./data";

/**
 * Procedural sphere sprites for the solar-system index. Each body's surface
 * is generated once, in code, from seeded 3D value noise sampled directly
 * on the unit sphere (no seams, no downloaded textures), then rendered into
 * a small offscreen canvas at the size it is actually drawn. Lighting from
 * the Sun is applied per frame by the renderer, so the sprites carry only
 * colour, surface detail and a soft limb.
 */

type RGB = [number, number, number];
type Surface = (x: number, y: number, z: number, mu: number) => RGB;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

export function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Noise = (x: number, y: number, z: number) => number;

/** 3D value noise, 0..1, smoothstep-interpolated on an integer lattice. */
function makeNoise(seed: number): Noise {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = rand();
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  // Unrolled: the same lattice hash (vals[perm[(perm[(perm[x] + y)] + z)]],
  // each index wrapped to 0..255) and the same lerp order as the original
  // closure-based version, so the output is identical, without allocating
  // a closure per sample.
  return (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    let xf = x - xi;
    let yf = y - yi;
    let zf = z - zi;
    xf = xf * xf * (3 - 2 * xf);
    yf = yf * yf * (3 - 2 * yf);
    zf = zf * zf * (3 - 2 * zf);
    const a0 = perm[xi & 255];
    const a1 = perm[(xi + 1) & 255];
    const b00 = perm[(a0 + yi) & 255];
    const b10 = perm[(a1 + yi) & 255];
    const b01 = perm[(a0 + yi + 1) & 255];
    const b11 = perm[(a1 + yi + 1) & 255];
    const v000 = vals[perm[(b00 + zi) & 255]];
    const v100 = vals[perm[(b10 + zi) & 255]];
    const v010 = vals[perm[(b01 + zi) & 255]];
    const v110 = vals[perm[(b11 + zi) & 255]];
    const v001 = vals[perm[(b00 + zi + 1) & 255]];
    const v101 = vals[perm[(b10 + zi + 1) & 255]];
    const v011 = vals[perm[(b01 + zi + 1) & 255]];
    const v111 = vals[perm[(b11 + zi + 1) & 255]];
    const x0 = v000 + (v100 - v000) * xf;
    const x1 = v010 + (v110 - v010) * xf;
    const x2 = v001 + (v101 - v001) * xf;
    const x3 = v011 + (v111 - v011) * xf;
    const y0 = x0 + (x1 - x0) * yf;
    const y1 = x2 + (x3 - x2) * yf;
    return y0 + (y1 - y0) * zf;
  };
}

function fbm(n: Noise, x: number, y: number, z: number, octaves: number) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * n(x * freq + 31.7 * i, y * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

const asin = (y: number) => Math.asin(clamp(y, -1, 1));

function unitVector(rand: () => number): RGB {
  const u = rand() * 2 - 1;
  const t = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(t), u, s * Math.sin(t)];
}

const SURFACES: Record<SurfaceId, (seed: number) => Surface> = {
  sun: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z, mu) => {
      const g = fbm(n, x * 7 + 10, y * 7, z * 7, 3);
      const fine = n(x * 22, y * 22, z * 22);
      const t = Math.sqrt(mu);
      // white-hot centre, gold, then orange-red at the limb
      const c = mix(
        [236, 92, 22],
        mix([255, 172, 52], [255, 244, 210], t * t * t),
        t
      );
      const br =
        (0.82 + 0.3 * g + 0.1 * (fine - 0.5)) * (0.6 + 0.4 * mu ** 0.5);
      return scale(c, br);
    };
  },
  mercury: (seed) => {
    const n = makeNoise(seed);
    const rand = mulberry32(seed + 7);
    const craters = Array.from({ length: 30 }, () => {
      const v = unitVector(rand);
      const r = 0.05 + rand() * 0.14;
      return { v, r, cosR: Math.cos(r) };
    });
    return (x, y, z, mu) => {
      let s = 0.7 + 0.42 * fbm(n, x * 3, y * 3, z * 3, 4);
      for (const c of craters) {
        // inside the crater's cap ⇔ angle < r ⇔ cos(angle) > cos(r)
        const dot = clamp(x * c.v[0] + y * c.v[1] + z * c.v[2], -1, 1);
        if (dot > c.cosR) {
          const q = Math.acos(dot) / c.r;
          s *= q > 0.8 ? 1.12 : 0.8 + 0.12 * q;
        }
      }
      return scale([150, 138, 126], s * (0.78 + 0.22 * mu));
    };
  },
  venus: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z, mu) => {
      const warp = fbm(n, x * 3, y * 3, z * 3, 2) * 1.3;
      const sw = fbm(n, x * 2.2, y * 5.5 + warp, z * 2.2, 4);
      const c = mix(
        [204, 164, 98],
        [246, 230, 190],
        clamp(sw * 1.3 - 0.12, 0, 1)
      );
      return scale(c, 0.8 + 0.2 * mu);
    };
  },
  earth: (seed) => {
    const n = makeNoise(seed);
    const m = makeNoise(seed + 3);
    return (x, y, z, mu) => {
      const lat = Math.abs(y);
      const land = fbm(n, x * 1.7, y * 1.7, z * 1.7, 5);
      let c: RGB;
      if (land > 0.535) {
        const v = fbm(m, x * 4, y * 4, z * 4, 3);
        c = mix(
          [56, 104, 48],
          [152, 124, 80],
          clamp(v * 1.4 - 0.32 + lat * 0.45, 0, 1)
        );
      } else {
        c = mix([12, 46, 106], [28, 96, 176], clamp(land * 1.65, 0, 1));
      }
      if (lat > 0.9 + (fbm(m, x * 5, y * 5, z * 5, 2) - 0.5) * 0.12)
        c = [234, 240, 246];
      const cl = fbm(m, x * 3.2 + 5, y * 4.6, z * 3.2, 4);
      c = mix(c, [246, 248, 252], clamp((cl - 0.55) * 3.2, 0, 0.85));
      return scale(c, 0.78 + 0.22 * mu);
    };
  },
  mars: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z, mu) => {
      const v = fbm(n, x * 2.6, y * 2.6, z * 2.6, 5);
      let c = mix([108, 48, 30], [208, 116, 68], clamp(v * 1.6 - 0.26, 0, 1));
      if (y > 0.92) c = mix(c, [236, 232, 228], clamp((y - 0.92) * 18, 0, 1));
      return scale(c, 0.8 + 0.2 * mu);
    };
  },
  jupiter: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z, mu) => {
      const turb = fbm(n, x * 3, y * 3, z * 3, 4) - 0.5;
      const lat = asin(y);
      const band = Math.sin(lat * 9.5 + turb * 1.1);
      const fine = Math.sin(lat * 23 + turb * 2.2);
      let c = mix(
        [148, 100, 64],
        [240, 226, 198],
        clamp(0.5 + band * 0.45 + fine * 0.08, 0, 1)
      );
      c = mix(c, [126, 108, 94], clamp((Math.abs(y) - 0.8) * 3, 0, 1) * 0.6);
      // the Great Red Spot, in the southern hemisphere
      const lon = Math.atan2(x, z);
      const e = ((lon - 0.5) / 0.3) ** 2 + ((lat + 0.36) / 0.1) ** 2;
      if (e < 1) c = mix(c, [194, 94, 64], (1 - e) * 0.85);
      return scale(c, 0.74 + 0.26 * mu ** 0.6);
    };
  },
  saturn: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z, mu) => {
      const turb = fbm(n, x * 2, y * 2, z * 2, 3) - 0.5;
      const band = Math.sin(asin(y) * 8 + turb * 0.6);
      let c = mix(
        [194, 164, 108],
        [240, 224, 176],
        clamp(0.55 + band * 0.3, 0, 1)
      );
      c = mix(c, [150, 160, 170], clamp((Math.abs(y) - 0.82) * 3, 0, 1) * 0.5);
      return scale(c, 0.74 + 0.26 * mu ** 0.6);
    };
  },
  uranus: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z, mu) => {
      const v = fbm(n, x * 1.5, y * 4, z * 1.5, 3);
      const c = mix(
        [124, 194, 206],
        [182, 232, 238],
        clamp(0.42 + (v - 0.5) * 0.5 + y * 0.15, 0, 1)
      );
      return scale(c, 0.76 + 0.24 * mu ** 0.5);
    };
  },
  neptune: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z, mu) => {
      const turb = fbm(n, x * 2.5, y * 2.5, z * 2.5, 4) - 0.5;
      const lat = asin(y);
      const band = Math.sin(lat * 7 + turb * 1.4);
      let c = mix(
        [32, 56, 148],
        [76, 120, 222],
        clamp(0.5 + band * 0.3 + turb * 0.4, 0, 1)
      );
      const lon = Math.atan2(x, z);
      const spot = ((lon - 0.9) / 0.28) ** 2 + ((lat + 0.35) / 0.09) ** 2;
      if (spot < 1) c = mix(c, [18, 28, 88], (1 - spot) * 0.8);
      const streak = ((lon + 0.4) / 0.35) ** 2 + ((lat - 0.45) / 0.025) ** 2;
      if (streak < 1) c = mix(c, [230, 238, 255], (1 - streak) * 0.7);
      return scale(c, 0.74 + 0.26 * mu ** 0.5);
    };
  },
};

/**
 * A lit-independent sphere sprite: `diameter` device pixels, equator
 * horizontal, anti-aliased edge. `spin` turns the globe about its axis so
 * two sprites of the same body can show slightly different faces.
 */
export function renderSphere(
  surface: SurfaceId,
  diameter: number,
  seed: number,
  spin = 0
): HTMLCanvasElement {
  const D = Math.max(4, Math.round(diameter));
  const canvas = document.createElement("canvas");
  canvas.width = D;
  canvas.height = D;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(D, D);
  const data = img.data;
  const fn = SURFACES[surface](seed);
  const R = D / 2;
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  for (let j = 0; j < D; j++) {
    for (let i = 0; i < D; i++) {
      const u = (i + 0.5 - R) / R;
      const v = (j + 0.5 - R) / R;
      const d = Math.sqrt(u * u + v * v);
      const cover = clamp((1 - d) * R + 0.5, 0, 1);
      if (cover <= 0) continue;
      const x = u;
      const y = -v;
      const z = Math.sqrt(Math.max(0, 1 - d * d));
      const c = fn(x * cs + z * sn, y, -x * sn + z * cs, z);
      const k = (j * D + i) * 4;
      data[k] = clamp(c[0], 0, 255);
      data[k + 1] = clamp(c[1], 0, 255);
      data[k + 2] = clamp(c[2], 0, 255);
      data[k + 3] = cover * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/* ── Maps for the rotating globe of the focused body ─────────────────
   The same surfaces sampled on a longitude × latitude grid (row 0 = north
   pole, column 0 = longitude -180°), unlit, so the globe renderer can
   turn the planet, move cloud layers on their own and light it from the
   Sun's actual direction. Sampled in 3D, so there is no seam at the
   date line. A few layers exist only as maps: Earth's land (alpha marks
   ocean, for sun glints) and clouds, Venus's cloud deck, and the Sun's
   granulation (brightness only; the renderer colours it by depth). */

export type MapId =
  SurfaceId | "sunGranules" | "earthLand" | "earthClouds" | "venusClouds";

export type MapData = {
  id: MapId;
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
};

/** colour, plus alpha 0..255 (cloud density, or a mask) */
type Layer = (
  x: number,
  y: number,
  z: number
) => [number, number, number, number];

const MAP_LAYERS: Partial<Record<MapId, (seed: number) => Layer>> = {
  sunGranules: (seed) => {
    const n = makeNoise(seed);
    return (x, y, z) => {
      // fine convection cells over a slow large-scale mottling
      const cells = n(x * 34, y * 34, z * 34);
      const g = fbm(n, x * 9 + 10, y * 9, z * 9, 3);
      const v = clamp(0.5 + (cells - 0.5) * 0.9 + (g - 0.5) * 0.7, 0, 1) * 255;
      return [v, v, v, 255];
    };
  },
  earthLand: (seed) => {
    const n = makeNoise(seed);
    const m = makeNoise(seed + 3);
    return (x, y, z) => {
      const lat = Math.abs(y);
      const land = fbm(n, x * 1.7, y * 1.7, z * 1.7, 5);
      const ice = lat > 0.9 + (fbm(m, x * 5, y * 5, z * 5, 2) - 0.5) * 0.12;
      if (ice) return [234, 240, 246, 0];
      if (land > 0.535) {
        const v = fbm(m, x * 4, y * 4, z * 4, 3);
        const c = mix(
          [56, 104, 48],
          [152, 124, 80],
          clamp(v * 1.4 - 0.32 + lat * 0.45, 0, 1)
        );
        return [c[0], c[1], c[2], 0];
      }
      const c = mix([12, 46, 106], [28, 96, 176], clamp(land * 1.65, 0, 1));
      return [c[0], c[1], c[2], 255];
    };
  },
  earthClouds: (seed) => {
    const m = makeNoise(seed + 3);
    const w = makeNoise(seed + 9);
    return (x, y, z) => {
      // swirled cloud systems, thicker toward the storm belts
      const warp = (fbm(w, x * 2, y * 2, z * 2, 2) - 0.5) * 1.2;
      const cl = fbm(m, x * 3.2 + 5 + warp, y * 4.6, z * 3.2 - warp, 5);
      const belt = 1 - Math.abs(Math.abs(y) - 0.55) * 0.9;
      const a = clamp((cl - 0.5 + belt * 0.06) * 3.4, 0, 0.92);
      return [246, 248, 252, a * 255];
    };
  },
  venusClouds: (seed) => {
    const n = makeNoise(seed + 5);
    return (x, y, z) => {
      // the dark Y-shaped chevrons of Venus's cloud deck: bands bent
      // toward the equator, streaked along the wind
      const lon = Math.atan2(x, z);
      const lat = asin(y);
      const chevron = Math.sin(
        lon * 2 + Math.abs(lat) * 3.2 + fbm(n, x * 2, y * 2, z * 2, 3) * 2.4
      );
      const streak = fbm(n, x * 1.4, y * 9, z * 1.4, 4);
      const a = clamp(0.18 + chevron * 0.22 + (streak - 0.5) * 0.6, 0, 0.75);
      const c = mix(
        [214, 176, 110],
        [250, 236, 200],
        clamp(streak * 1.2, 0, 1)
      );
      return [c[0], c[1], c[2], a * 255];
    };
  },
};

export function renderMap(
  id: MapId,
  w: number,
  h: number,
  seed: number
): MapData {
  const rgba = new Uint8ClampedArray(w * h * 4);
  const layer = MAP_LAYERS[id]?.(seed);
  const surface = layer ? null : SURFACES[id as SurfaceId](seed);
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - (j + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat);
    const y = Math.sin(lat);
    for (let i = 0; i < w; i++) {
      const lon = ((i + 0.5) / w - 0.5) * Math.PI * 2;
      const x = cl * Math.sin(lon);
      const z = cl * Math.cos(lon);
      const k = (j * w + i) * 4;
      if (layer) {
        const c = layer(x, y, z);
        rgba[k] = c[0];
        rgba[k + 1] = c[1];
        rgba[k + 2] = c[2];
        rgba[k + 3] = c[3];
      } else {
        const c = surface!(x, y, z, 1);
        rgba[k] = c[0];
        rgba[k + 1] = c[1];
        rgba[k + 2] = c[2];
        rgba[k + 3] = 255;
      }
    }
  }
  return { id, w, h, rgba };
}
