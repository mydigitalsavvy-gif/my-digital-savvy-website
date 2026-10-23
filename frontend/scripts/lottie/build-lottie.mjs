// Builds the site's Lottie animations into public/lottie/*.json.
//   node scripts/lottie/build-lottie.mjs
// Each animation illustrates the copy it sits next to; see the comment
// above each one. Brand palette only; accent layers follow CSS (lib.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  C,
  K,
  A,
  rc,
  el,
  pl,
  curve,
  star,
  fl,
  st,
  tm,
  gr,
  layer,
  comp,
  pop,
  fade,
  ringScale,
  ringFade,
} from "./lib.mjs";

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../public/lottie"
);
fs.mkdirSync(OUT, { recursive: true });
const files = {};

const cursor = (tip = [0, 0]) => {
  const [x, y] = tip;
  return gr([
    pl(
      [
        [x, y],
        [x, y + 22],
        [x + 6, y + 16],
        [x + 10, y + 25],
        [x + 14, y + 23],
        [x + 10, y + 14],
        [x + 18, y + 14],
      ],
      true
    ),
    fl(C.ink),
    st(C.paper, 1.5),
  ]);
};

/* ═══ HERO · "Marketing that pays for itself" ═══════════════════════
   An ROI dashboard: spend bars grow, the return line climbs past them,
   the end point pulses. Line + last bar take the rotor's accent. */
{
  const OP = 180,
    base = 268,
    xs = [70, 118, 166, 214, 262],
    hs = [40, 64, 92, 126, 166],
    bw = 30;
  const tops = hs.map((h) => base - h - 16);
  const line = [
    [44, base - 30],
    ...xs.map((x, i) => [x, tops[i]]),
    [306, tops[4] - 24],
  ];
  const card = [
    layer("card", [
      gr([rc(336, 292, 20, [180, 160]), fl(C.card), st(C.line, 1.5)]),
    ]),
    layer("chrome", [
      gr([
        el(9, 9, [40, 36]),
        el(9, 9, [56, 36]),
        el(9, 9, [72, 36]),
        fl(C.dim),
      ]),
      gr([rc(74, 9, 4.5, [296, 36]), fl(C.line)]),
      gr([
        pl([
          [24, 56],
          [336, 56],
        ]),
        st("#1C1C1C", 1),
      ]),
      gr([
        pl([
          [24, base],
          [336, base],
        ]),
        st(C.line, 1.5),
      ]),
      gr([
        pl([
          [24, 120],
          [336, 120],
        ]),
        pl([
          [24, 194],
          [336, 194],
        ]),
        st("#181818", 1, 100, [3, 6]),
      ]),
    ]),
  ];
  const L = [];
  xs.forEach((x, i) => {
    const last = i === xs.length - 1;
    const t = 10 + i * 7;
    L.push(
      layer(
        `bar${i}`,
        [
          gr(
            [
              rc(bw, hs[i], 7, [x, base - hs[i] / 2]),
              fl(last ? C.cyan : "#1F1F1F"),
            ],
            {
              a: [x, base],
              s: A([
                [t, [100, 0], "out"],
                [t + 26, [100, 100]],
              ]),
            }
          ),
        ],
        last ? { cl: "accf" } : {}
      )
    );
  });
  L.push(
    layer(
      "area",
      [gr([pl([...line, [306, base], [44, base]], true), fl(C.cyan, 9)])],
      {
        cl: "accf",
        o: A([
          [60, 0],
          [84, 100],
        ]),
      }
    )
  );
  L.push(
    layer(
      "line",
      [
        gr([
          curve(line, false, 0.12),
          tm(
            0,
            A([
              [34, 0, "inout"],
              [82, 100],
            ])
          ),
          st(C.cyan, 3.5),
        ]),
      ],
      { cl: "accs" }
    )
  );
  line.slice(1, -1).forEach((pt, i) => {
    L.push(
      layer(`pt${i}`, [
        gr([el(10, 10, pt), fl(C.ink)], { a: pt, s: pop(42 + i * 8) }),
      ])
    );
  });
  const end = line[line.length - 1];
  [0, 1, 2].forEach((k) => {
    const t = 92 + k * 26;
    L.push(
      layer(
        `ring${k}`,
        [
          gr([el(16, 16, end), st(C.cyan, 2)], {
            a: end,
            s: ringScale(t, 34, 100, 360),
          }),
        ],
        { cl: "accs", o: ringFade(t, 34) }
      )
    );
  });
  L.push(
    layer("end", [gr([el(16, 16, end), fl(C.cyan)], { a: end, s: pop(84) })], {
      cl: "accf",
    })
  );
  // KPI chip: "return is up" — accent arrow + two text bars
  const kx = 92,
    ky = 92;
  const kpi = { a: [kx, ky], s: pop(98) };
  L.push(
    layer(
      "kpi",
      [
        gr([rc(110, 34, 17, [kx, ky]), fl("#161616"), st(C.edge, 1)]),
        gr([rc(44, 6, 3, [kx + 16, ky - 5]), fl(C.ink)]),
        gr([rc(30, 5, 2.5, [kx + 9, ky + 6]), fl(C.mute)]),
      ],
      kpi
    )
  );
  L.push(
    layer("kpi-dot", [gr([el(22, 22, [kx - 36, ky]), fl(C.cyan)])], {
      cl: "accf",
      ...kpi,
    })
  );
  L.push(
    layer(
      "kpi-arrow",
      [
        gr([
          pl([
            [kx - 41, ky + 1],
            [kx - 36, ky - 4],
            [kx - 31, ky + 1],
          ]),
          pl([
            [kx - 36, ky - 4],
            [kx - 36, ky + 6],
          ]),
          st(C.paper, 2.2),
        ]),
      ],
      kpi
    )
  );
  files["hero-roi"] = comp({ w: 360, h: 320, op: OP, base: card, layers: L });
}

/* ═══ GROWTH 01 · Traffic — "people actively looking for what you offer"
   Dots stream in along three lanes and converge on the business. */
{
  const OP = 120,
    T = [306, 150],
    lanes = [52, 150, 248];
  const L = [
    layer("lanes", [
      gr([
        ...lanes.map((y) =>
          pl([
            [24, y],
            [T[0] - 46, T[1]],
          ])
        ),
        st(C.line, 1.5, 100, [2, 7]),
      ]),
    ]),
    layer("rings", [
      gr([el(132, 132, T), st(C.line, 1.5)]),
      gr([el(84, 84, T), st(C.dim, 1.5)]),
    ]),
  ];
  for (let i = 0; i < 12; i++) {
    const y0 = lanes[i % 3],
      t0 = (i * 10) % OP,
      dur = 54;
    for (const shift of [0, -OP]) {
      const t = t0 + shift;
      if (t + dur < 0) continue;
      const acc = i % 4 === 1;
      L.push(
        layer(
          `d${i}${shift}`,
          [gr([el(10, 10), fl(acc ? C.cyan : "#9A9A9A")])],
          {
            cl: acc ? "accf" : undefined,
            p: A([
              [t, [24, y0], "in"],
              [t + dur, T],
            ]),
            o: A([
              [t, 0],
              [t + 8, 100],
              [t + dur - 8, 100],
              [t + dur, 0],
            ]),
          }
        )
      );
    }
  }
  [0, 40, 80].forEach((t, k) => {
    L.push(
      layer(
        `pulse${k}`,
        [
          gr([el(30, 30, T), st(C.cyan, 2)], {
            a: T,
            s: ringScale(t, 40, 100, 440),
          }),
        ],
        { cl: "accs", o: ringFade(t, 40) }
      )
    );
  });
  L.push(layer("core", [gr([el(30, 30, T), fl(C.cyan)])], { cl: "accf" }));
  L.push(
    layer("store", [
      gr([
        pl(
          [
            [T[0] - 7, T[1] + 4],
            [T[0] - 7, T[1] - 2],
            [T[0], T[1] - 8],
            [T[0] + 7, T[1] - 2],
            [T[0] + 7, T[1] + 4],
          ],
          true
        ),
        fl(C.paper),
      ]),
    ])
  );
  files["growth-traffic"] = comp({
    w: 400,
    h: 300,
    op: OP,
    layers: L,
    fade: false,
  });
}

/* ═══ GROWTH 02 · Ads & SEO — be the result people click
   A search is typed, results load, your listing climbs to #1 and gets
   the click. */
{
  const OP = 160,
    ys = [126, 186, 246];
  const L = [
    layer("bar", [
      gr([rc(320, 50, 25, [200, 56]), fl(C.card), st(C.edge, 1.5)]),
      gr([
        el(15, 15, [66, 54]),
        pl([
          [71, 60],
          [77, 66],
        ]),
        st(C.ash, 2),
      ]),
    ]),
    layer("query", [
      gr([
        pl([
          [94, 56],
          [236, 56],
        ]),
        tm(
          0,
          A([
            [6, 0, "lin"],
            [34, 100],
          ])
        ),
        st("#9A9A9A", 8),
      ]),
    ]),
    layer("caret", [gr([rc(2.5, 22, 1, [0, 0]), fl(C.cyan)])], {
      cl: "accf",
      p: A([
        [6, [94, 56], "lin"],
        [34, [244, 56]],
      ]),
      o: A([
        [34, 100, "hold"],
        [42, 0, "hold"],
        [50, 100, "hold"],
        [58, 0, "hold"],
        [66, 100, "hold"],
        [74, 0],
      ]),
    }),
    layer(
      "go",
      [
        gr([el(34, 34, [342, 56]), fl(C.cyan)], {
          a: [342, 56],
          s: A([
            [0, [0, 0], "back"],
            [12, [100, 100]],
            [36, [100, 100], "soft"],
            [40, [84, 84], "out"],
            [48, [100, 100]],
          ]),
        }),
      ],
      { cl: "accf" }
    ),
    layer("go-arrow", [
      gr(
        [
          pl([
            [335, 56],
            [349, 56],
          ]),
          pl([
            [343, 50],
            [349, 56],
            [343, 62],
          ]),
          st(C.paper, 2.5),
        ],
        { a: [342, 56], s: pop(0) }
      ),
    ]),
  ];
  const result = (nm, mine) => [
    gr([rc(320, 48, 10, [200, 0]), fl(mine ? C.card2 : C.card), st(C.line, 1)]),
    gr([rc(32, 32, 7, [62, 0]), fl(mine ? "#1B1B1B" : "#181818")]),
    gr([rc(140, 8, 4, [160, -8]), fl(mine ? C.ink : C.dim)]),
    gr([rc(196, 6, 3, [188, 8]), fl(C.line)]),
  ];
  // order: others start in slots 1,2; yours starts in slot 3 then climbs.
  const enter = (k) => fade(44 + k * 6, null, 10);
  const slot = (from, to) =>
    A([
      [84, [0, ys[from]], "inout"],
      [106, [0, ys[to]]],
    ]);
  L.push(layer("r-a", result("a", false), { p: slot(0, 1), o: enter(0) }));
  L.push(layer("r-b", result("b", false), { p: slot(1, 2), o: enter(1) }));
  L.push(layer("r-mine", result("mine", true), { p: slot(2, 0), o: enter(2) }));
  L.push(
    layer("r-mine-acc", [gr([rc(320, 48, 10, [200, 0]), st(C.cyan, 1.5)])], {
      cl: "accs",
      p: slot(2, 0),
      o: enter(2),
    })
  );
  L.push(
    layer(
      "r-mine-fill",
      [
        gr([rc(32, 32, 7, [62, 0]), fl(C.cyan, 30)]),
        gr([rc(30, 16, 8, [330, 0]), fl(C.cyan)]),
      ],
      { cl: "accf", p: slot(2, 0), o: enter(2) }
    )
  );
  L.push(
    layer(
      "rank-up",
      [
        gr([
          pl([
            [376, 12],
            [376, -12],
          ]),
          pl([
            [369, -5],
            [376, -12],
            [383, -5],
          ]),
          st(C.cyan, 2.5),
        ]),
      ],
      {
        cl: "accs",
        p: slot(2, 0),
        o: A([
          [82, 0],
          [88, 100],
          [118, 100],
          [128, 0],
        ]),
      }
    )
  );
  L.push(
    layer(
      "click-ring",
      [
        gr([rc(320, 48, 10, [200, ys[0]]), st(C.cyan, 2)], {
          a: [200, ys[0]],
          s: A([
            [124, [100, 100], "out"],
            [146, [112, 150]],
          ]),
        }),
      ],
      { cl: "accs", o: ringFade(124, 22) }
    )
  );
  L.push(
    layer("cursor", [cursor([0, 0])], {
      p: A([
        [100, [380, 300], "inout"],
        [120, [262, ys[0] + 2]],
      ]),
      s: A([
        [120, [100, 100, 100], "out"],
        [124, [86, 86, 100], "out"],
        [130, [100, 100, 100]],
      ]),
      o: fade(98, null, 6),
    })
  );
  files["growth-ads"] = comp({ w: 400, h: 300, op: OP, layers: L });
}

/* ═══ GROWTH 03 · Website — fast, tracked, built to convert
   The page assembles block by block, the visitor clicks the CTA and an
   enquiry notification lands. */
{
  const OP = 170;
  const L = [
    layer("frame", [
      gr([rc(330, 236, 14, [200, 150]), fl(C.card), st(C.edge, 1.5)]),
      gr([
        pl([
          [35, 60],
          [365, 60],
        ]),
        st(C.line, 1.5),
      ]),
      gr([
        el(8, 8, [54, 47]),
        el(8, 8, [67, 47]),
        el(8, 8, [80, 47]),
        fl(C.dim),
      ]),
      gr([rc(150, 13, 6.5, [210, 47]), fl("#1A1A1A")]),
    ]),
    layer(
      "nav",
      [
        gr([rc(40, 8, 4, [76, 80]), fl(C.ash)]),
        gr([
          rc(20, 5, 2.5, [270, 80]),
          rc(20, 5, 2.5, [298, 80]),
          rc(20, 5, 2.5, [326, 80]),
          fl(C.dim),
        ]),
      ],
      { o: fade(8) }
    ),
    layer(
      "hero-bg",
      [
        gr([rc(296, 78, 9, [200, 136]), fl(C.cyan, 10)], {
          a: [200, 136],
          s: A([
            [16, [100, 0], "out"],
            [32, [100, 100]],
          ]),
        }),
      ],
      { cl: "accf" }
    ),
    layer(
      "hero-copy",
      [
        gr([rc(146, 11, 5.5, [139, 118]), fl(C.ink)]),
        gr([rc(110, 7, 3.5, [121, 137]), fl(C.mute)]),
      ],
      { o: fade(26) }
    ),
  ];
  L.push(
    layer(
      "cta",
      [
        gr([rc(64, 18, 9, [98, 158]), fl(C.cyan)], {
          a: [98, 158],
          s: pop(34),
        }),
      ],
      { cl: "accf" }
    )
  );
  [111, 200, 289].forEach((x, k) => {
    const t = 44 + k * 7;
    L.push(
      layer(
        `col${k}`,
        [
          gr([rc(84, 66, 9, [x, 220]), fl("#131313"), st(C.line, 1)]),
          gr([
            rc(48, 6, 3, [x - 8, 230]),
            rc(30, 5, 2.5, [x - 17, 242]),
            fl(C.dim),
          ]),
        ],
        { a: [x, 220], s: pop(t) }
      )
    );
    L.push(
      layer(`ico${k}`, [gr([el(16, 16, [x - 25, 205]), fl(C.cyan, 55)])], {
        cl: "accf",
        a: [x - 25, 205],
        s: pop(t + 4),
      })
    );
  });
  L.push(
    layer(
      "cta-ring",
      [
        gr([rc(64, 18, 9, [98, 158]), st(C.cyan, 2)], {
          a: [98, 158],
          s: A([
            [100, [100, 100], "out"],
            [122, [150, 220]],
          ]),
        }),
      ],
      { cl: "accs", o: ringFade(100, 22) }
    )
  );
  L.push(
    layer("cursor", [cursor()], {
      p: A([
        [70, [360, 280], "inout"],
        [96, [106, 160]],
      ]),
      s: A([
        [96, [100, 100, 100], "out"],
        [100, [86, 86, 100], "out"],
        [106, [100, 100, 100]],
      ]),
      o: fade(68, null, 6),
    })
  );
  // enquiry toast
  const tx = 292,
    ty = 256;
  const slide = {
    p: A([
      [108, [30, 0], "out"],
      [124, [0, 0]],
    ]),
    o: fade(108, null, 8),
  };
  L.push(
    layer(
      "toast-body",
      [
        gr([rc(112, 36, 11, [tx, ty]), fl("#161616"), st(C.edge, 1)]),
        gr([rc(48, 6, 3, [tx + 4, ty - 5]), fl(C.ink)]),
        gr([rc(34, 5, 2.5, [tx - 3, ty + 6]), fl(C.mute)]),
      ],
      slide
    )
  );
  L.push(
    layer("toast-dot", [gr([el(18, 18, [tx - 36, ty]), fl(C.cyan)])], {
      cl: "accf",
      ...slide,
    })
  );
  L.push(
    layer(
      "toast-tick",
      [
        gr([
          pl([
            [tx - 41, ty],
            [tx - 37, ty + 4],
            [tx - 31, ty - 4],
          ]),
          tm(
            0,
            A([
              [118, 0, "out"],
              [126, 100],
            ])
          ),
          st(C.paper, 2.2),
        ]),
      ],
      slide
    )
  );
  files["growth-website"] = comp({ w: 400, h: 300, op: OP, layers: L });
}

/* ═══ GROWTH 04 · Lead — the enquiry is captured
   A form fills in, gets submitted, the lead lands with a tick. */
{
  const OP = 160,
    cx = 160;
  const L = [
    layer("card", [
      gr([rc(224, 240, 16, [cx, 150]), fl(C.card), st(C.edge, 1.5)]),
      gr([rc(112, 10, 5, [cx - 44, 56]), fl(C.ink)]),
      gr([
        rc(40, 5, 2.5, [cx - 70, 84]),
        rc(52, 5, 2.5, [cx - 64, 142]),
        fl(C.dim),
      ]),
      gr([
        rc(184, 32, 9, [cx, 106]),
        rc(184, 32, 9, [cx, 164]),
        fl("#121212"),
        st(C.line, 1.5),
      ]),
      gr([rc(184, 34, 17, [cx, 222]), fl("#1C1C1C")]),
    ]),
    layer("f1-focus", [gr([rc(184, 32, 9, [cx, 106]), st(C.cyan, 1.5)])], {
      cl: "accs",
      o: A([
        [6, 0],
        [12, 100],
        [36, 100],
        [42, 0],
      ]),
    }),
    layer("f2-focus", [gr([rc(184, 32, 9, [cx, 164]), st(C.cyan, 1.5)])], {
      cl: "accs",
      o: A([
        [38, 0],
        [44, 100],
        [66, 100],
        [72, 0],
      ]),
    }),
    layer("f1-text", [
      gr([
        pl([
          [cx - 78, 106],
          [cx + 12, 106],
        ]),
        tm(
          0,
          A([
            [10, 0, "lin"],
            [34, 100],
          ])
        ),
        st("#A0A0A0", 7),
      ]),
    ]),
    layer("f2-text", [
      gr([
        pl([
          [cx - 78, 164],
          [cx + 34, 164],
        ]),
        tm(
          0,
          A([
            [42, 0, "lin"],
            [64, 100],
          ])
        ),
        st("#A0A0A0", 7),
      ]),
    ]),
    layer(
      "submit",
      [
        gr([rc(184, 34, 17, [cx, 222]), fl(C.cyan)], {
          a: [cx, 222],
          s: A([
            [70, [0, 100], "out"],
            [82, [100, 100], "soft"],
            [84, [96, 90], "out"],
            [92, [100, 100]],
          ]),
        }),
      ],
      { cl: "accf" }
    ),
    layer(
      "submit-arrow",
      [
        gr([
          pl([
            [cx - 8, 222],
            [cx + 8, 222],
          ]),
          pl([
            [cx + 2, 216],
            [cx + 8, 222],
            [cx + 2, 228],
          ]),
          st(C.paper, 2.5),
        ]),
      ],
      { o: fade(80, null, 6) }
    ),
  ];
  const ck = [324, 120];
  L.push(
    layer("fly", [gr([el(12, 12), fl(C.cyan)])], {
      cl: "accf",
      p: A([
        [90, [cx, 222], "inout"],
        [108, ck],
      ]),
      o: A([
        [89, 0, "hold"],
        [90, 100],
        [106, 100],
        [110, 0],
      ]),
    })
  );
  L.push(
    layer(
      "check-ring",
      [
        gr(
          [
            el(84, 84, ck),
            tm(
              0,
              A([
                [104, 0, "out"],
                [124, 100],
              ])
            ),
            st(C.cyan, 3),
          ],
          { r: -90, a: ck }
        ),
      ],
      { cl: "accs" }
    )
  );
  L.push(
    layer(
      "check-fill",
      [gr([el(84, 84, ck), fl(C.cyan, 14)], { a: ck, s: pop(114) })],
      { cl: "accf" }
    )
  );
  L.push(
    layer(
      "check-mark",
      [
        gr([
          pl([
            [ck[0] - 16, ck[1] + 1],
            [ck[0] - 4, ck[1] + 13],
            [ck[0] + 18, ck[1] - 11],
          ]),
          tm(
            0,
            A([
              [118, 0, "out"],
              [132, 100],
            ])
          ),
          st(C.cyan, 4.5),
        ]),
      ],
      { cl: "accs" }
    )
  );
  L.push(
    layer(
      "burst",
      [
        gr([el(84, 84, ck), st(C.cyan, 2)], {
          a: ck,
          s: ringScale(124, 30, 100, 170),
        }),
      ],
      { cl: "accs", o: ringFade(124, 30) }
    )
  );
  files["growth-lead"] = comp({ w: 400, h: 300, op: OP, layers: L });
}

/* ═══ GROWTH 05 · WhatsApp & Sales — routed to your phone in real time
   A chat opens on the phone: enquiry in, quick reply out, typing, the
   customer confirms, a double-tick reply closes it. */
{
  const OP = 190,
    X0 = 128,
    X1 = 272;
  const L = [
    layer("phone", [
      gr([rc(176, 286, 28, [200, 150]), fl("#0B0B0B"), st(C.edge, 2)]),
      gr([rc(48, 6, 3, [200, 20]), fl(C.line)]),
      gr([el(24, 24, [138, 48]), fl(C.dim)]),
      gr([rc(62, 7, 3.5, [189, 44]), fl(C.mute)]),
      gr([rc(36, 5, 2.5, [176, 56]), fl(C.line)]),
      gr([
        pl([
          [112, 68],
          [288, 68],
        ]),
        st(C.line, 1),
      ]),
    ]),
    layer("online", [gr([el(8, 8, [148, 57]), fl(C.cyan)])], { cl: "accf" }),
  ];
  const bubble = (nm, mine, y, w, h, t, lines) => {
    const x = mine ? X1 - w / 2 : X0 + w / 2;
    const pivot = [mine ? X1 : X0, y + h / 2];
    L.push(
      layer(
        nm,
        [
          gr(
            [
              rc(w, h, 12, [x, y]),
              fl(mine ? C.cyan : "#1C1C1C", mine ? 90 : 100),
            ],
            { a: pivot, s: pop(t) }
          ),
        ],
        mine ? { cl: "accf" } : {}
      )
    );
    L.push(
      layer(nm + "-t", [
        gr(
          [
            ...lines.map(([lw, dy]) =>
              rc(lw, 5, 2.5, [x - w / 2 + 12 + lw / 2, y + dy])
            ),
            fl(mine ? C.paper : C.mute, mine ? 55 : 100),
          ],
          { a: pivot, s: pop(t) }
        ),
      ])
    );
  };
  bubble("b1", false, 98, 112, 32, 8, [
    [78, -4],
    [50, 6],
  ]);
  bubble("b2", true, 140, 102, 30, 32, [[70, 0]]);
  // typing indicator
  L.push(
    layer("typing", [gr([rc(52, 26, 13, [X0 + 26, 182]), fl("#1C1C1C")])], {
      a: [X0, 195],
      s: pop(54, 92),
    })
  );
  [0, 1, 2].forEach((k) => {
    const x = X0 + 14 + k * 12,
      t0 = 58 + k * 4;
    L.push(
      layer(`dot${k}`, [gr([el(6, 6), fl(C.ash)])], {
        p: A([
          [t0, [x, 182], "soft"],
          [t0 + 7, [x, 177], "soft"],
          [t0 + 14, [x, 182], "soft"],
          [t0 + 21, [x, 177], "soft"],
          [t0 + 28, [x, 182]],
        ]),
        o: A([
          [54, 0],
          [58, 100],
          [90, 100],
          [93, 0],
        ]),
      })
    );
  });
  bubble("b3", false, 184, 124, 42, 96, [
    [92, -8],
    [70, 2],
    [40, 12],
  ]);
  bubble("b4", true, 232, 92, 30, 122, [[44, 0]]);
  L.push(
    layer("ticks", [
      gr(
        [
          pl([
            [X1 - 30, 232],
            [X1 - 26, 236],
            [X1 - 19, 228],
          ]),
          pl([
            [X1 - 23, 236],
            [X1 - 16, 228],
          ]),
          st(C.paper, 2),
        ],
        { a: [X1, 247], s: pop(122) }
      ),
    ])
  );
  // notification badge on the phone corner
  const nb = [282, 24];
  L.push(
    layer(
      "badge-ring",
      [
        gr([el(22, 22, nb), st(C.cyan, 2)], {
          a: nb,
          s: ringScale(14, 30, 100, 260),
        }),
      ],
      { cl: "accs", o: ringFade(14, 30) }
    )
  );
  L.push(
    layer("badge", [gr([el(22, 22, nb), fl(C.cyan)], { a: nb, s: pop(8) })], {
      cl: "accf",
    })
  );
  L.push(
    layer("badge-n", [
      gr(
        [
          pl([
            [nb[0], nb[1] - 5],
            [nb[0], nb[1] + 5],
          ]),
          st(C.paper, 2.5),
        ],
        { a: nb, s: pop(8) }
      ),
    ])
  );
  files["growth-whatsapp"] = comp({ w: 400, h: 300, op: OP, layers: L });
}

/* ═══ GROWTH 06 · Growth — more clients, more reviews, more to reinvest
   Revenue bars rise, the trend line breaks upward, review stars land. */
{
  const OP = 170,
    base = 252;
  const xs = [84, 132, 180, 228, 276, 324],
    hs = [26, 42, 58, 84, 118, 156];
  const pts = [
    [84, 218],
    [132, 204],
    [180, 186],
    [228, 154],
    [276, 120],
    [324, 76],
  ];
  const L = [
    layer("axes", [
      gr([
        pl([
          [52, 36],
          [52, base],
          [368, base],
        ]),
        st(C.edge, 1.5),
      ]),
      gr([
        pl([
          [52, 196],
          [368, 196],
        ]),
        pl([
          [52, 140],
          [368, 140],
        ]),
        pl([
          [52, 84],
          [368, 84],
        ]),
        st("#1A1A1A", 1, 100, [3, 6]),
      ]),
    ]),
  ];
  xs.forEach((x, i) =>
    L.push(
      layer(`bar${i}`, [
        gr(
          [
            rc(24, hs[i], 6, [x, base - hs[i] / 2]),
            fl(i === 5 ? "#262626" : "#1C1C1C"),
          ],
          {
            a: [x, base],
            s: A([
              [6 + i * 5, [100, 0], "out"],
              [30 + i * 5, [100, 100]],
            ]),
          }
        ),
      ])
    )
  );
  L.push(
    layer(
      "area",
      [gr([pl([...pts, [324, base], [84, base]], true), fl(C.cyan, 10)])],
      {
        cl: "accf",
        o: A([
          [60, 0],
          [84, 100],
        ]),
      }
    )
  );
  L.push(
    layer(
      "trend",
      [
        gr([
          curve(pts, false, 0.15),
          tm(
            0,
            A([
              [28, 0, "inout"],
              [72, 100],
            ])
          ),
          st(C.cyan, 3.5),
        ]),
      ],
      { cl: "accs" }
    )
  );
  L.push(
    layer(
      "head",
      [
        gr(
          [
            pl([
              [312.5, 91.9],
              [324, 76],
              [306.3, 77.2],
            ]),
            st(C.cyan, 3.5),
          ],
          { a: [324, 76], s: pop(70) }
        ),
      ],
      { cl: "accs" }
    )
  );
  pts
    .slice(0, -1)
    .forEach((p, i) =>
      L.push(
        layer(`p${i}`, [
          gr([el(9, 9, p), fl(C.ink)], { a: p, s: pop(34 + i * 8) }),
        ])
      )
    );
  [
    [352, 44, 11, 80],
    [302, 38, 7, 88],
    [370, 84, 6, 96],
  ].forEach(([x, y, r, t], k) => {
    L.push(
      layer(
        `star${k}`,
        [
          gr([star([x, y], r, r * 0.45), fl(C.cyan)], {
            a: [x, y],
            s: A([
              [t, [0, 0], "back"],
              [t + 14, [100, 100], "soft"],
              [t + 40, [100, 100], "soft"],
              [t + 50, [80, 80], "soft"],
              [t + 60, [100, 100]],
            ]),
            r: A([
              [t, -60, "out"],
              [t + 18, 0],
            ]),
          }),
        ],
        { cl: "accf" }
      )
    );
  });
  files["growth-growth"] = comp({ w: 400, h: 300, op: OP, layers: L });
}

/* ═══ PROCESS icons (120×120) ═══════════════════════════════════════ */
// 01 Audit — the magnifier scans your account and finds what's leaking.
{
  const OP = 150;
  const L = [
    layer("page", [
      gr([rc(60, 78, 9, [52, 60]), fl(C.card), st(C.dim, 2)]),
      gr([
        rc(34, 5, 2.5, [49, 38]),
        rc(40, 5, 2.5, [52, 52]),
        rc(28, 5, 2.5, [46, 66]),
        rc(36, 5, 2.5, [50, 80]),
        fl(C.line),
      ]),
    ]),
    layer("found", [
      gr([el(10, 10, [66, 66]), fl(C.magenta)], {
        a: [66, 66],
        s: A([
          [60, [0, 0], "back"],
          [72, [100, 100], "soft"],
          [98, [100, 100], "in"],
          [104, [0, 0]],
        ]),
      }),
    ]),
    layer(
      "fixed",
      [
        gr([
          pl([
            [60, 66],
            [64, 70],
            [72, 61],
          ]),
          tm(
            0,
            A([
              [104, 0, "out"],
              [114, 100],
            ])
          ),
          st(C.cyan, 2.8),
        ]),
      ],
      { cl: "accs" }
    ),
  ];
  L.push(
    layer(
      "lens",
      [
        gr([el(28, 28, [0, 0]), fl(C.cyan, 10)]),
        gr([el(28, 28, [0, 0]), st(C.cyan, 3)]),
        gr([
          pl([
            [10, 10],
            [20, 20],
          ]),
          st(C.cyan, 4),
        ]),
      ],
      {
        cl: "accs",
        p: A([
          [0, [76, 34], "inout"],
          [26, [40, 48], "inout"],
          [50, [68, 64], "soft"],
          [78, [68, 64], "inout"],
          [110, [84, 84], "inout"],
          [150, [76, 34]],
        ]),
      }
    )
  );
  files["process-audit"] = comp({ w: 120, h: 120, op: OP, layers: L });
}
// 02 Plan — one goal, one budget: the arrow hits the centre.
{
  const OP = 140,
    c = [56, 64];
  const L = [
    layer("target", [
      gr([el(76, 76, c), st(C.dim, 2)]),
      gr([el(48, 48, c), st(C.dim, 2)]),
    ]),
    layer("bull", [gr([el(18, 18, c), fl(C.cyan)])], { cl: "accf" }),
    layer(
      "hit",
      [
        gr([el(18, 18, c), st(C.cyan, 2)], {
          a: c,
          s: ringScale(30, 26, 100, 420),
        }),
      ],
      { cl: "accs", o: ringFade(30, 26) }
    ),
    layer(
      "arrow",
      [
        gr([
          pl([
            [0, 0],
            [36, -36],
          ]),
          pl([
            [11, -2],
            [0, 0],
            [2, -11],
          ]),
          pl([
            [33.9, -25.4],
            [24, -24],
            [25.4, -33.9],
          ]),
          pl([
            [39.9, -31.4],
            [30, -30],
            [31.4, -39.9],
          ]),
          st(C.ink, 3),
        ]),
      ],
      {
        p: A([
          [10, [120, -10], "in"],
          [30, c],
        ]),
        r: A([
          [30, 0, "soft"],
          [34, -5, "soft"],
          [38, 3, "soft"],
          [42, 0],
        ]),
        a: [0, 0],
        o: A([
          [9, 0, "hold"],
          [10, 100],
          [118, 100],
          [128, 0],
        ]),
      }
    ),
  ];
  files["process-plan"] = comp({
    w: 120,
    h: 120,
    op: OP,
    layers: L,
    fade: false,
  });
}
// 03 Build — site, tracking and creative stack into one thing.
{
  const OP = 140;
  const blocks = [
    [96, 66, 0],
    [72, 54, 14],
    [48, 42, 28],
  ];
  const L = [
    layer("ground", [
      gr([
        pl([
          [16, 108],
          [104, 108],
        ]),
        st(C.dim, 2),
      ]),
    ]),
  ];
  blocks.forEach(([y, w, t], k) => {
    const top = k === 2;
    L.push(
      layer(
        `b${k}`,
        [
          gr([
            rc(w, 22, 5, [60, 0]),
            top ? fl(C.cyan) : fl(k ? "#1E1E1E" : "#181818"),
            ...(top ? [] : [st(C.dim, 1.5)]),
          ]),
        ],
        {
          cl: top ? "accf" : undefined,
          p: A([
            [t + 4, [0, y - 60], "back"],
            [t + 20, [0, y]],
          ]),
          o: A([
            [t + 3, 0, "hold"],
            [t + 4, 100],
          ]),
        }
      )
    );
  });
  L.push(
    layer(
      "spark",
      [
        gr(
          [
            pl([
              [60, 18],
              [60, 8],
            ]),
            pl([
              [44, 22],
              [38, 14],
            ]),
            pl([
              [76, 22],
              [82, 14],
            ]),
            st(C.cyan, 2.5),
          ],
          { a: [60, 30], s: pop(50) }
        ),
      ],
      { cl: "accs" }
    )
  );
  files["process-build"] = comp({ w: 120, h: 120, op: OP, layers: L });
}
// 04 Report — a weekly chart, plain: what we spent, what came back.
{
  const OP = 150;
  const pts = [
    [30, 84],
    [48, 74],
    [66, 78],
    [84, 56],
    [96, 40],
  ];
  const L = [
    layer("frame", [
      gr([rc(88, 80, 10, [62, 62]), fl(C.card), st(C.dim, 2)]),
      gr([
        rc(8, 18, 2, [36, 92]),
        rc(8, 28, 2, [52, 87]),
        rc(8, 22, 2, [68, 90]),
        rc(8, 36, 2, [84, 83]),
        fl(C.line),
      ]),
    ]),
    layer(
      "line",
      [
        gr([
          curve(pts, false, 0.15),
          tm(
            0,
            A([
              [14, 0, "inout"],
              [56, 100],
            ])
          ),
          st(C.cyan, 3),
        ]),
      ],
      { cl: "accs" }
    ),
    layer(
      "dot",
      [gr([el(10, 10, [96, 40]), fl(C.cyan)], { a: [96, 40], s: pop(54) })],
      { cl: "accf" }
    ),
    layer(
      "ring",
      [
        gr([el(10, 10, [96, 40]), st(C.cyan, 2)], {
          a: [96, 40],
          s: ringScale(64, 30, 100, 320),
        }),
      ],
      { cl: "accs", o: ringFade(64, 30) }
    ),
  ];
  files["process-report"] = comp({ w: 120, h: 120, op: OP, layers: L });
}

/* ═══ INSIGHTS · honest writing on what moves the needle ═══════════
   Articles stack up, the idea lights up. */
{
  const OP = 200;
  const card = (nm, x, y, r, t, front) => {
    const shapes = [
      gr([
        rc(196, 132, 12, [0, 0]),
        fl(front ? C.card2 : C.card),
        st(front ? C.edge : C.line, 1.5),
      ]),
      gr([rc(172, 52, 8, [0, -28]), fl(front ? "#191919" : "#151515")]),
      gr([rc(132, 8, 4, [-20, 14]), fl(front ? C.ink : C.mute)]),
      gr([rc(150, 5, 2.5, [-11, 30]), rc(110, 5, 2.5, [-31, 42]), fl(C.line)]),
    ];
    L.push(
      layer(nm, shapes, {
        p: A([
          [t, [x, y + 40], "out"],
          [t + 22, [x, y]],
          ...(front
            ? [
                [90, [x, y], "soft"],
                [130, [x, y - 6], "soft"],
                [170, [x, y]],
              ]
            : []),
        ]),
        r: A([
          [t, r * 2, "out"],
          [t + 22, r],
        ]),
        o: fade(t, null, 10),
      })
    );
  };
  const L = [];
  card("c1", 140, 150, -9, 4, false);
  card("c2", 168, 140, 5, 12, false);
  card("c3", 180, 156, 0, 20, true);
  // trend inside the front card's thumbnail
  L.push(
    layer(
      "trend",
      [
        gr([
          curve(
            [
              [110, 140],
              [140, 130],
              [166, 134],
              [200, 116],
              [252, 106],
            ],
            false,
            0.15
          ),
          tm(
            0,
            A([
              [40, 0, "inout"],
              [74, 100],
            ])
          ),
          st(C.cyan, 3),
        ]),
      ],
      {
        cl: "accs",
        p: A([
          [90, [0, 0], "soft"],
          [130, [0, -6], "soft"],
          [170, [0, 0]],
        ]),
      }
    )
  );
  // light bulb
  const b = [300, 66];
  L.push(
    layer(
      "glow",
      [
        gr([el(40, 40, b), fl(C.cyan, 22)], {
          a: b,
          s: A([
            [54, [0, 0], "back"],
            [68, [100, 100]],
          ]),
        }),
      ],
      { cl: "accf" }
    )
  );
  L.push(
    layer(
      "bulb",
      [
        gr([
          curve(
            [
              [b[0] - 9, b[1] + 22],
              [b[0] - 9, b[1] + 14],
              [b[0] - 19, b[1] + 2],
              [b[0] - 18, b[1] - 10],
              [b[0], b[1] - 21],
              [b[0] + 18, b[1] - 10],
              [b[0] + 19, b[1] + 2],
              [b[0] + 9, b[1] + 14],
              [b[0] + 9, b[1] + 22],
            ],
            false,
            0.2
          ),
          st(C.ink, 2.5),
        ]),
        gr([
          pl([
            [b[0] - 8, b[1] + 28],
            [b[0] + 8, b[1] + 28],
          ]),
          pl([
            [b[0] - 5, b[1] + 34],
            [b[0] + 5, b[1] + 34],
          ]),
          st(C.ash, 2.5),
        ]),
      ],
      { o: fade(30, null, 12) }
    )
  );
  const rays = [-90, -45, 0, 180, -135].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return pl([
      [b[0] + Math.cos(a) * 30, b[1] + Math.sin(a) * 30],
      [b[0] + Math.cos(a) * 40, b[1] + Math.sin(a) * 40],
    ]);
  });
  L.push(
    layer(
      "rays",
      [
        gr([...rays, st(C.cyan, 2.5)], {
          a: b,
          s: A([
            [60, [60, 60], "back"],
            [74, [100, 100], "soft"],
            [110, [100, 100], "soft"],
            [124, [88, 88], "soft"],
            [138, [100, 100]],
          ]),
        }),
      ],
      { cl: "accs", o: fade(60, null, 8) }
    )
  );
  files["insights"] = comp({ w: 360, h: 260, op: OP, layers: L });
}

/* ═══ FREE AUDIT · "tell you exactly what's leaking" ════════════════
   Leads pour into the funnel; some leak out the sides. The lens finds
   both leaks, they're patched, and every lead comes out the bottom. */
{
  const OP = 210;
  const funnel = [
    [70, 52],
    [250, 52],
    [178, 140],
    [178, 196],
    [142, 196],
    [142, 140],
  ];
  const hL = [104, 94],
    hR = [216, 94];
  const L = [
    layer("funnel", [
      gr([pl(funnel, true), fl(C.card), st(C.dim, 2)]),
      gr([el(180, 14, [160, 52]), fl("#141414"), st(C.dim, 2)]),
    ]),
    layer(
      "holes",
      [gr([el(10, 10, hL), el(10, 10, hR), fl(C.paper), st(C.magenta, 1.5)])],
      {
        o: A([
          [96, 100],
          [104, 0],
        ]),
      }
    ),
  ];
  for (let i = 0; i < 18; i++) {
    const t = i * 11 - 10,
      x0 = 110 + ((i * 37) % 100);
    const fixed = t >= 100;
    const leak = !fixed && i % 2 === 0;
    const side = i % 4 === 0 ? hL : hR;
    const out =
      side === hL ? [side[0] - 34, side[1] + 70] : [side[0] + 34, side[1] + 70];
    const path = leak
      ? [
          [t, [x0, -6], "in"],
          [t + 14, [x0, 54], "soft"],
          [t + 26, side, "in"],
          [t + 44, out],
        ]
      : [
          [t, [x0, -6], "in"],
          [t + 14, [x0, 54], "soft"],
          [t + 30, [160, 150], "lin"],
          [t + 44, [160, 236]],
        ];
    L.push(
      layer(`lead${i}`, [gr([el(9, 9), fl(leak ? C.magenta : C.cyan)])], {
        cl: leak ? undefined : "accf",
        p: A(path),
        o: A([
          [t, 0],
          [t + 5, 100],
          [t + 38, 100],
          [t + 44, 0],
        ]),
      })
    );
  }
  const patch = (h, rot, t) =>
    layer(
      `patch${rot}`,
      [gr([rc(22, 9, 4.5, h), fl(C.cyan)], { a: h, s: pop(t), r: rot })],
      { cl: "accf" }
    );
  L.push(patch(hL, -51, 84));
  L.push(patch(hR, 51, 102));
  L.push(
    layer(
      "lens",
      [
        gr([el(40, 40), fl(C.cyan, 8)]),
        gr([el(40, 40), st(C.cyan, 3)]),
        gr([
          pl([
            [14, 14],
            [28, 28],
          ]),
          st(C.cyan, 4.5),
        ]),
      ],
      {
        cl: "accs",
        p: A([
          [60, [40, 150], "inout"],
          [80, [hL[0] - 4, hL[1] - 2], "soft"],
          [88, [hL[0] - 4, hL[1] - 2], "inout"],
          [100, [hR[0] + 4, hR[1] - 2], "soft"],
          [108, [hR[0] + 4, hR[1] - 2], "inout"],
          [126, [290, 180]],
        ]),
        o: A([
          [58, 0],
          [64, 100],
          [120, 100],
          [128, 0],
        ]),
      }
    )
  );
  files["audit-funnel"] = comp({ w: 320, h: 250, op: OP, layers: L });
}

/* ═══ CONTACT · "Tell us what's not working" ═══════════════════════
   Your message flies to our Nagpur office pin; a reply starts typing
   straight back. */
{
  const OP = 190;
  // one cubic bezier route, sampled by arc length so the plane and the
  // accent trail (trim paths go by length) stay in step
  const P0 = [34, 206],
    C1 = [120, 206],
    C2 = [120, 96],
    P1 = [196, 120],
    C3 = [262, 140],
    C4 = [262, 70],
    P2 = [292, 62];
  const bez = (a, b, c, d, t) =>
    a.map(
      (_, k) =>
        (1 - t) ** 3 * a[k] +
        3 * (1 - t) ** 2 * t * b[k] +
        3 * (1 - t) * t * t * c[k] +
        t ** 3 * d[k]
    );
  const dense = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 100;
    dense.push(t <= 1 ? bez(P0, C1, C2, P1, t) : bez(P1, C3, C4, P2, t - 1));
  }
  const cum = [0];
  for (let i = 1; i < dense.length; i++)
    cum.push(
      cum[i - 1] +
        Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1])
    );
  const at = (f) => {
    const L = f * cum[cum.length - 1];
    let i = cum.findIndex((c) => c >= L);
    i = Math.max(1, i);
    return [dense[i], dense[i - 1]];
  };
  const T0 = 10,
    T1 = 70,
    N = 20;
  const posK = [],
    rotK = [];
  for (let k = 0; k <= N; k++) {
    const f = k / N,
      e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2; // ease-in-out by distance
    const [p, q] = at(Math.max(0.002, e));
    const t = T0 + (T1 - T0) * f;
    posK.push([t, p, "lin"]);
    rotK.push([
      t,
      (Math.atan2(p[1] - q[1], p[0] - q[0]) * 180) / Math.PI,
      "lin",
    ]);
  }
  const route = {
    ty: "sh",
    d: 1,
    ks: K({
      i: [
        [0, 0],
        [C2[0] - P1[0], C2[1] - P1[1]],
        [C4[0] - P2[0], C4[1] - P2[1]],
      ],
      o: [
        [C1[0] - P0[0], C1[1] - P0[1]],
        [C3[0] - P1[0], C3[1] - P1[1]],
        [0, 0],
      ],
      v: [P0, P1, P2],
      c: false,
    }),
  };
  const trailE = A(
    posK.map(([t], k) => {
      const f = k / N;
      return [
        t,
        (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2) * 100,
        "lin",
      ];
    })
  );
  const pin = [292, 40]; // tip lands on the route end
  const L = [
    layer("route", [gr([route, st(C.edge, 1.5, 100, [3, 7])])]),
    layer("trail", [gr([route, tm(0, trailE), st(C.cyan, 2.5)])], {
      cl: "accs",
    }),
    layer("start", [gr([el(10, 10, P0), fl(C.ash)])]),
  ];
  [0, 1].forEach((k) => {
    const t = 74 + k * 22;
    L.push(
      layer(
        `ground${k}`,
        [
          gr([el(30, 10, [pin[0], pin[1] + 22]), st(C.cyan, 1.5)], {
            a: [pin[0], pin[1] + 22],
            s: ringScale(t, 34, 100, 300),
          }),
        ],
        { cl: "accs", o: ringFade(t, 34) }
      )
    );
  });
  const pinShape = [
    pl(
      [
        [pin[0] - 12.5, pin[1] + 3],
        [pin[0], pin[1] + 22],
        [pin[0] + 12.5, pin[1] + 3],
      ],
      true
    ),
    el(28, 28, pin),
  ];
  L.push(
    layer(
      "pin",
      [
        gr([...pinShape, fl(C.cyan)], {
          a: [pin[0], pin[1] + 22],
          s: A([
            [66, [0, 0], "back"],
            [80, [100, 100]],
          ]),
        }),
      ],
      { cl: "accf" }
    )
  );
  L.push(
    layer("pin-dot", [
      gr([el(10, 10, pin), fl(C.paper)], {
        a: [pin[0], pin[1] + 22],
        s: A([
          [66, [0, 0], "back"],
          [80, [100, 100]],
        ]),
      }),
    ])
  );
  L.push(
    layer(
      "plane",
      [
        gr([
          pl(
            [
              [15, 0],
              [-11, -10],
              [-5, 0],
              [-11, 10],
            ],
            true
          ),
          fl(C.ink),
        ]),
        gr([
          pl([
            [15, 0],
            [-5, 0],
          ]),
          st(C.dim, 1.2),
        ]),
      ],
      {
        p: A(posK),
        r: A(rotK),
        o: A([
          [T0 - 1, 0, "hold"],
          [T0, 100],
          [T1 - 4, 100],
          [T1, 0],
        ]),
      }
    )
  );
  // reply bubble: typing, then the reply
  const bx = 236,
    by = 176;
  const bub = { a: [bx + 62, by + 22], s: pop(92) };
  L.push(
    layer(
      "reply",
      [gr([rc(132, 46, 16, [bx, by]), fl(C.card2), st(C.edge, 1)])],
      bub
    )
  );
  L.push(
    layer("reply-av", [gr([el(20, 20, [bx - 44, by]), fl(C.cyan)])], {
      cl: "accf",
      ...bub,
    })
  );
  [0, 1, 2].forEach((k) => {
    const x = bx - 16 + k * 12,
      t0 = 98 + k * 4;
    L.push(
      layer(`typing${k}`, [gr([el(7, 7), fl(C.ash)])], {
        p: A([
          [t0, [x, by], "soft"],
          [t0 + 7, [x, by - 5], "soft"],
          [t0 + 14, [x, by], "soft"],
          [t0 + 21, [x, by - 5], "soft"],
          [t0 + 28, [x, by]],
        ]),
        o: A([
          [96, 0],
          [100, 100],
          [124, 100],
          [128, 0],
        ]),
      })
    );
  });
  L.push(
    layer(
      "reply-text",
      [
        gr([rc(70, 7, 3.5, [bx + 7, by - 7]), fl(C.ink)]),
        gr([rc(48, 6, 3, [bx - 4, by + 8]), fl(C.mute)]),
      ],
      { o: fade(128, null, 8) }
    )
  );
  files["contact-reach"] = comp({ w: 340, h: 240, op: OP, layers: L });
}

for (const [name, json] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(json));
  console.log(
    name.padEnd(18),
    (JSON.stringify(json).length / 1024).toFixed(1) + " KB"
  );
}
