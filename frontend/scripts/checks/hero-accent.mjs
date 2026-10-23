// Regression check: the hero rotor's colour must stay local to the hero.
//
//   pnpm check:hero-accent                         (site running on :3000)
//   BASE_URL=http://localhost:3100 pnpm check:hero-accent
//   WIDTHS=1440,390 pnpm check:hero-accent         (default: 1440,1280,1024,390,375,360)
//   CHROME_PATH=/path/to/chrome pnpm check:hero-accent
//
// Drives a real headless Chrome over the DevTools protocol, so it needs no
// extra dependencies (Node 22+ for the global fetch and WebSocket). It reads
// computed styles, not pixels. For every width it:
//
//   hero      lets the rotor run: the word must rotate, the hero's accent
//             must follow it, and the word fill and hero chart must show
//             that same colour at every sample (one source of truth)
//   services  scrolls to a service panel and waits through two rotor
//             cycles: the rotor must keep changing the hero, while the
//             services accent, glow, progress bar and the page accent stay
//             exactly the panel's own colour
//   back      returns to the hero: the rotor must still rotate
//   other     scrolls to the case-studies badge and waits through two
//             rotor cycles: its colour and the page accent must not change
//
// then a reduced-motion pass: first word only, fully coloured, chart in the
// same colour, and the page accent never written.
//
// The consult popup is suppressed (as a returning visitor) so it can't
// cover the page; it has no effect on any accent. Exits 1 on any failure.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const WIDTHS = (process.env.WIDTHS ?? "1440,1280,1024,390,375,360")
  .split(",")
  .map((w) => Number(w.trim()))
  .filter(Boolean);
const REDUCED_WIDTHS = [WIDTHS[0], WIDTHS.find((w) => w < 768)].filter(Boolean);
const TWO_CYCLES_MS = 13_500; // the rotor spends 6.5s on each word
const HERO_WINDOW_MS = 8_000; // long enough to see at least one word change
const SETTLE_MS = 1_200; // services glow and bar transition for up to 0.6s
const SAMPLE_MS = 200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  return [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((p) => p && fs.existsSync(p));
}

/* ── minimal DevTools protocol client ──────────────────────────── */
async function launch() {
  const bin = findChrome();
  if (!bin) throw new Error("Chrome not found; set CHROME_PATH");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hero-accent-"));
  const proc = spawn(
    bin,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  let port = "";
  for (let i = 0; i < 150 && !port; i++) {
    try {
      port = fs
        .readFileSync(path.join(profile, "DevToolsActivePort"), "utf8")
        .split("\n")[0]
        .trim();
    } catch {
      await sleep(100);
    }
  }
  if (!port) throw new Error("Chrome did not open a debugging port");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(
    targets.find((t) => t.type === "page").webSocketDebuggerUrl
  );
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(new Error(m.error.message));
      else resolve(m.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };
  const close = () => {
    try {
      ws.close();
    } catch {}
    proc.kill();
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {}
    }, 500);
  };
  return { send, evaluate, close };
}

/* ── what the page shows, as plain values ──────────────────────── */
const PROBE = `(() => {
  const hex = (c) => {
    c = (c || "").trim();
    const m = c.match(/^rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (m) return "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("").toUpperCase();
    return c.toUpperCase();
  };
  const prop = (el, p) => (el ? getComputedStyle(el).getPropertyValue(p).trim() : "");
  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const rotor = document.getElementById("rotor");
  const top = document.getElementById("rotorTop");
  const chart = document.querySelector(".hero-visual .lottie");
  const stage = document.querySelector(".wd-stage");
  const panels = [...document.querySelectorAll(".wd-panel")];
  const panel = panels.find((p) => p.classList.contains("is-on")) || panels[0];
  const bar = document.querySelector(".wd-progress-fill");
  const badge = document.querySelector(".cs-badge");
  return {
    word: rotor ? rotor.querySelector(".base").textContent : "",
    filled: rotor ? rotor.classList.contains("go") : false,
    pageAccentWritten: hex(root.style.getPropertyValue("--accent")),
    pageAccent: hex(prop(root, "--accent")),
    heroAccent: hex(prop(hero, "--accent")),
    wordColor: top ? hex(getComputedStyle(top).color) : "",
    chartColor: hex(prop(chart, "--lot-acc")),
    panel: panel ? panels.indexOf(panel) : -1,
    panelColor: hex(prop(panel, "--c")),
    servicesAccent: hex(prop(stage, "--accent")),
    servicesGlow: stage ? getComputedStyle(stage, "::before").backgroundImage : "",
    servicesBar: bar ? hex(getComputedStyle(bar).backgroundColor) : "",
    badgeColor: badge ? hex(getComputedStyle(badge).color) : "",
  };
})()`;

async function sample(page, ms) {
  const out = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    out.push(await page.evaluate(PROBE));
    await sleep(SAMPLE_MS);
  }
  return out;
}

const distinct = (samples, key) => [...new Set(samples.map((s) => s[key]))];

/* ── assertions ────────────────────────────────────────────────── */
const results = [];
function check(pass, name, ok, detail) {
  results.push({ pass, name, ok, detail });
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`
  );
}
const show = (vals) => vals.map((v) => v || "none").join(" → ");
function constant(pass, name, samples, keys) {
  for (const key of keys) {
    const vals = distinct(samples, key);
    check(pass, `${name}: ${key} unchanged`, vals.length === 1, show(vals));
  }
}
function heroSynced(pass, name, samples, hasChart) {
  const wordOff = samples.filter((s) => s.wordColor !== s.heroAccent);
  check(
    pass,
    `${name}: word colour = hero accent at every sample`,
    wordOff.length === 0,
    wordOff.length
      ? `${wordOff.length} samples differ, e.g. word ${wordOff[0].wordColor} vs hero ${wordOff[0].heroAccent}`
      : ""
  );
  if (hasChart) {
    const chartOff = samples.filter((s) => s.chartColor !== s.heroAccent);
    check(
      pass,
      `${name}: hero chart = hero accent at every sample`,
      chartOff.length === 0,
      chartOff.length
        ? `${chartOff.length} samples differ, e.g. chart ${chartOff[0].chartColor} vs hero ${chartOff[0].heroAccent}`
        : ""
    );
  }
}

async function open(page, width, reduce) {
  const height = width < 768 ? 812 : 900;
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await page.send("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: reduce ? "reduce" : "no-preference",
      },
    ],
  });
  await page.send("Page.navigate", { url: BASE_URL });
  for (let i = 0; i < 100; i++) {
    await sleep(150);
    const ready = await page
      .evaluate(
        `document.readyState === "complete" && !!document.getElementById("rotor")?.classList.contains("go")`
      )
      .catch(() => false);
    if (ready) return;
  }
  throw new Error(
    `${BASE_URL} did not load a running hero rotor at ${width}px`
  );
}

async function scrollTo(page, expression) {
  await page.evaluate(
    `window.scrollTo({ top: ${expression}, behavior: "instant" })`
  );
  await sleep(SETTLE_MS);
}

async function motionPass(page, width) {
  const pass = `${width}px`;
  console.log(`\n${pass}`);
  await open(page, width, false);
  const hasChart = await page.evaluate(
    `!!document.querySelector(".hero-visual .lottie")`
  );

  // hero: the rotor drives the hero's accent, and nothing else
  const hero = await sample(page, HERO_WINDOW_MS);
  check(
    pass,
    "hero: word rotates",
    distinct(hero, "word").length >= 2,
    show(distinct(hero, "word"))
  );
  check(
    pass,
    "hero: hero accent follows the word",
    distinct(hero, "heroAccent").length >= 2,
    show(distinct(hero, "heroAccent"))
  );
  heroSynced(pass, "hero", hero, hasChart);
  constant(pass, "hero", hero, [
    "pageAccentWritten",
    "pageAccent",
    "badgeColor",
  ]);

  // services: one panel on screen through two rotor cycles
  await scrollTo(
    page,
    `(() => { const t = document.getElementById("wdTrack"); const n = document.querySelectorAll(".wd-panel").length;
      const top = t.getBoundingClientRect().top + scrollY; const total = t.offsetHeight - innerHeight;
      return Math.round(top + Math.max(0, total) * 1.5 / n); })()`
  );
  const services = await sample(page, TWO_CYCLES_MS);
  check(
    pass,
    "services: hero rotor kept changing meanwhile",
    distinct(services, "heroAccent").length >= 2,
    show(distinct(services, "heroAccent"))
  );
  constant(pass, "services", services, [
    "panel",
    "servicesAccent",
    "servicesGlow",
    "servicesBar",
    "pageAccent",
    "pageAccentWritten",
  ]);
  const off = services.filter((s) => s.servicesAccent !== s.panelColor);
  check(
    pass,
    "services: accent is the panel's own colour",
    off.length === 0,
    `panel ${services[0].panel + 1} colour ${services[0].panelColor}` +
      (off.length
        ? `, services showed ${show(distinct(off, "servicesAccent"))}`
        : "")
  );

  // back to the hero: still rotating, still in step
  await scrollTo(page, "0");
  const back = await sample(page, HERO_WINDOW_MS);
  check(
    pass,
    "back in hero: word still rotates",
    distinct(back, "word").length >= 2,
    show(distinct(back, "word"))
  );
  heroSynced(pass, "back in hero", back, hasChart);
  constant(pass, "back in hero", back, ["pageAccentWritten", "pageAccent"]);

  // a later section through two rotor cycles
  await scrollTo(
    page,
    `(() => { const b = document.querySelector(".cs-badge"); return Math.round(b.getBoundingClientRect().top + scrollY - innerHeight / 2); })()`
  );
  const other = await sample(page, TWO_CYCLES_MS);
  check(
    pass,
    "case studies: hero rotor kept changing meanwhile",
    distinct(other, "heroAccent").length >= 2,
    show(distinct(other, "heroAccent"))
  );
  constant(pass, "case studies", other, [
    "badgeColor",
    "pageAccent",
    "pageAccentWritten",
  ]);
}

async function reducedPass(page, width) {
  const pass = `${width}px reduced motion`;
  console.log(`\n${pass}`);
  await open(page, width, true);
  const hasChart = await page.evaluate(
    `!!document.querySelector(".hero-visual .lottie")`
  );
  const hero = await sample(page, HERO_WINDOW_MS);
  constant(pass, "reduced", hero, ["word", "filled", "heroAccent"]);
  check(
    pass,
    "reduced: first word shown fully coloured",
    hero.every((s) => s.filled),
    show(distinct(hero, "word"))
  );
  heroSynced(pass, "reduced", hero, hasChart);
  check(
    pass,
    "reduced: page accent never written",
    hero.every((s) => !s.pageAccentWritten),
    show(distinct(hero, "pageAccentWritten"))
  );
  await scrollTo(
    page,
    `Math.round(document.querySelector(".wd-stage").getBoundingClientRect().top + scrollY)`
  );
  const services = await sample(page, 2_500);
  constant(pass, "reduced services", services, [
    "servicesAccent",
    "pageAccent",
    "pageAccentWritten",
  ]);
}

const page = await launch();
let failed = 1;
try {
  await page.send("Page.enable");
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "try { localStorage.setItem('mds_consult_done', '1') } catch (e) {}",
  });
  console.log(`hero accent check against ${BASE_URL}`);
  for (const w of WIDTHS) await motionPass(page, w);
  for (const w of REDUCED_WIDTHS) await reducedPass(page, w);
  const bad = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - bad.length}/${results.length} checks passed`
  );
  if (bad.length) {
    console.log("failed:");
    for (const r of bad)
      console.log(`  [${r.pass}] ${r.name}  ${r.detail ?? ""}`);
  }
  failed = bad.length ? 1 : 0;
} catch (err) {
  console.error(err);
} finally {
  page.close();
}
process.exitCode = failed;
