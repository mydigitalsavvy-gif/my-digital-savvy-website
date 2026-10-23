// Tiny Lottie (bodymovin 5.x) authoring kit used by build-lottie.mjs.
// Everything is drawn in composition pixels with absolute coordinates;
// groups animate around an explicit pivot via {a, p} on their transform.
//
// Accent colour: layers given cl "accf" (accent fill) or "accs" (accent
// stroke) are recoloured at runtime by CSS through var(--lot-acc), so one
// file follows the section's accent (the hero rotor, a growth stage's --c).
// The colour baked into the JSON is only the fallback.

export const C = {
  paper: "#080808",
  card: "#0F0F0F",
  card2: "#141414",
  line: "#262626",
  edge: "#2E2E2E",
  dim: "#3A3A3A",
  mute: "#4A4A4A",
  ash: "#808080",
  ink: "#EFEFEF",
  cyan: "#01FEFB",
  green: "#3BFF45",
  blue: "#4DAAFF",
  magenta: "#D42DF5",
};

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

// CSS-style cubic-beziers, expressed as Lottie out/in tangents.
const EASES = {
  out: [0.16, 0.84, 0.28, 1],
  in: [0.55, 0, 0.85, 0.3],
  inout: [0.65, 0, 0.35, 1],
  back: [0.34, 1.56, 0.64, 1],
  lin: [0, 0, 1, 1],
  soft: [0.4, 0, 0.2, 1],
};

const arr = (v) => (Array.isArray(v) ? v : [v]);
const isAnim = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && "a" in v;

export const K = (v) => ({ a: 0, k: v });

/** Animated property: A([[t, value, ease?], ...]). ease names the curve
 *  from this key to the next; "hold" jumps. */
export const A = (keys) => ({
  a: 1,
  k: [...keys]
    .sort((x, y) => x[0] - y[0])
    .map(([t, v, e], i, all) => {
      const kf = { t, s: arr(v) };
      if (i < all.length - 1) {
        if (e === "hold") kf.h = 1;
        else {
          const [x1, y1, x2, y2] = EASES[e || "out"];
          kf.o = { x: [x1], y: [y1] };
          kf.i = { x: [x2], y: [y2] };
        }
      }
      return kf;
    }),
});

const P = (v) => (isAnim(v) ? v : K(v));

// Layer-level transforms want 3 components; pad static + animated values.
const pad3 = (v, z) => {
  if (isAnim(v)) {
    return {
      a: 1,
      k: v.k.map((kf) => ({
        ...kf,
        s: kf.s.length === 2 ? [...kf.s, z] : kf.s,
      })),
    };
  }
  return K(v.length === 2 ? [...v, z] : v);
};

/* ── shapes ─────────────────────────────────────────────────────── */
export const rc = (w, h, r = 0, p = [0, 0]) => ({
  ty: "rc",
  d: 1,
  s: P(isAnim(w) ? w : [w, h]),
  p: P(p),
  r: P(r),
});
export const el = (w, h = w, p = [0, 0]) => ({
  ty: "el",
  d: 1,
  s: P([w, h]),
  p: P(p),
});
/** Polyline (straight segments). */
export const pl = (pts, closed = false) => ({
  ty: "sh",
  d: 1,
  ks: K({
    i: pts.map(() => [0, 0]),
    o: pts.map(() => [0, 0]),
    v: pts,
    c: closed,
  }),
});
/** Smooth curve through points (Catmull-Rom → bezier tangents). */
export const curve = (pts, closed = false, tension = 0.18) => {
  const n = pts.length;
  const i = [],
    o = [];
  for (let k = 0; k < n; k++) {
    const prev = pts[Math.max(0, k - 1)],
      next = pts[Math.min(n - 1, k + 1)];
    const dx = (next[0] - prev[0]) * tension,
      dy = (next[1] - prev[1]) * tension;
    const ends = !closed && (k === 0 || k === n - 1);
    i.push(ends ? [0, 0] : [-dx, -dy]);
    o.push(ends ? [0, 0] : [dx, dy]);
  }
  return { ty: "sh", d: 1, ks: K({ i, o, v: pts, c: closed }) };
};
export const star = (p, or, ir, pts = 5) => ({
  ty: "sr",
  sy: 1,
  d: 1,
  pt: K(pts),
  p: K(p),
  r: K(0),
  ir: K(ir),
  is: K(0),
  or: K(or),
  os: K(0),
});
export const fl = (c, o = 100) => ({ ty: "fl", c: K(hex(c)), o: P(o), r: 1 });
export const st = (c, w = 2, o = 100, dash) => ({
  ty: "st",
  c: K(hex(c)),
  o: P(o),
  w: P(w),
  lc: 2,
  lj: 2,
  ml: 4,
  ...(dash
    ? {
        d: [
          { n: "d", nm: "dash", v: K(dash[0]) },
          { n: "g", nm: "gap", v: K(dash[1]) },
        ],
      }
    : {}),
});
export const tm = (s, e, o = 0) => ({
  ty: "tm",
  s: P(s),
  e: P(e),
  o: P(o),
  m: 1,
});
// Lottie paints earlier styles on top: order geometry, modifiers, then
// strokes before fills so outlines sit over their fill.
const RANK = { tm: 1, st: 2, fl: 3 };
export const gr = (items, t = {}) => ({
  ty: "gr",
  it: [
    ...[...items].sort((x, y) => (RANK[x.ty] ?? 0) - (RANK[y.ty] ?? 0)),
    {
      ty: "tr",
      p: P(t.p ?? t.a ?? [0, 0]),
      a: P(t.a ?? [0, 0]),
      s: P(t.s ?? [100, 100]),
      r: P(t.r ?? 0),
      o: P(t.o ?? 100),
      sk: K(0),
      sa: K(0),
    },
  ],
});

/* ── layers ─────────────────────────────────────────────────────── */
export const layer = (nm, shapes, t = {}) => ({
  ddd: 0,
  ty: 4,
  nm,
  sr: 1,
  ks: {
    o: P(t.o ?? 100),
    r: P(t.r ?? 0),
    p: pad3(t.p ?? t.a ?? [0, 0], 0),
    a: pad3(t.a ?? [0, 0], 0),
    s: pad3(t.s ?? [100, 100], 100),
  },
  ao: 0,
  // authored bottom → top; Lottie wants the top-most shape first
  shapes: [...(Array.isArray(shapes) ? shapes : [shapes])].reverse(),
  ip: t.ip ?? -1000,
  op: t.op ?? 100000,
  st: 0,
  bm: 0,
  ...(t.cl ? { cl: t.cl } : {}),
});

/** Composition. Layers are given bottom → top. `fade` wraps them in a
 *  precomp whose opacity fades in at the start and out before the loop
 *  point, so every loop resets cleanly; `base` layers sit outside it. */
export const comp = ({ w, h, op, fr = 30, layers, base = [], fade = true }) => {
  const order = (ls) =>
    [...ls].reverse().map((l, i) => ({
      ...l,
      ind: i + 1,
      ip: Math.max(l.ip, 0),
      op: Math.min(l.op, op),
    }));
  if (!fade) {
    return {
      v: "5.7.4",
      fr,
      ip: 0,
      op,
      w,
      h,
      nm: "mds",
      ddd: 0,
      assets: [],
      layers: order([...base, ...layers]),
    };
  }
  const pre = {
    ddd: 0,
    ty: 0,
    nm: "scene",
    refId: "scene",
    sr: 1,
    ks: {
      o: A([
        [0, 0],
        [8, 100],
        [op - 16, 100, "soft"],
        [op - 3, 0],
      ]),
      r: K(0),
      p: K([0, 0, 0]),
      a: K([0, 0, 0]),
      s: K([100, 100, 100]),
    },
    ao: 0,
    w,
    h,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
  return {
    v: "5.7.4",
    fr,
    ip: 0,
    op,
    w,
    h,
    nm: "mds",
    ddd: 0,
    assets: [{ id: "scene", layers: order(layers) }],
    layers: order([...base, pre]),
  };
};

/* ── animation helpers ──────────────────────────────────────────── */
/** Scale pop-in at t (overshoot), optional pop-out at tOut. */
export const pop = (t, tOut, d = 12) =>
  A([
    [t, [0, 0], "back"],
    [t + d, [100, 100]],
    ...(tOut != null
      ? [
          [tOut, [100, 100], "in"],
          [tOut + 8, [0, 0]],
        ]
      : []),
  ]);
/** Opacity fade in at t, optional fade out at tOut. */
export const fade = (t, tOut, d = 10) =>
  A([
    [t, 0],
    [t + d, 100],
    ...(tOut != null
      ? [
          [tOut, 100],
          [tOut + d, 0],
        ]
      : []),
  ]);
/** Expanding ring: scale from→to, opacity 80→0 between t and t+d. */
export const ringScale = (t, d = 30, from = 100, to = 260) =>
  A([
    [t, [from, from], "out"],
    [t + d, [to, to]],
  ]);
export const ringFade = (t, d = 30) =>
  A([
    [t - 1, 0, "hold"],
    [t, 80, "out"],
    [t + d, 0],
  ]);
