"use client";

import { useEffect } from "react";
import { servicesProgress } from "./servicesProgress";

/**
 * Scroll controller for the pinned services sequence. Renders nothing: the
 * panels stay server-rendered and this only toggles classes and custom
 * properties on them. Scrolling stays native throughout: there is no wheel,
 * touch or key handling, nothing is prevented or counted.
 *
 * - Scroll progress through #wdTrack is a continuous position `s`
 *   (0 = service 01 … n-1 = the last), published to servicesProgress for
 *   the solar system, which animates every pixel of it. The pinned range
 *   adds one service-length of arrival before the first service (s -1…0:
 *   the camera closes in on the Sun) and one of departure after the last
 *   (s n-1…n), so a gesture entering the section has room to settle on
 *   service 01 (and one coming back up from below, on the last one).
 * - The panel shown is the nearest service to `s` (a small dead band keeps
 *   a position resting on a boundary from flickering).
 * - Rest correction. Each service has a rest position; between two rests
 *   the stage shows a transition. When a scroll ends between rests (native
 *   `scrollend`, after a short quiet moment so a multi-notch wheel roll
 *   counts as one gesture), the page glides on to the next rest in the
 *   direction it was moving: it completes the transition under way and
 *   never pulls back against the gesture. A scroll that ends just past a
 *   rest (where the view is identical to the rest) stays put, and a few
 *   pixels of jitter are ignored. One gesture therefore moves at least
 *   one service and the page never rests mid-transition. In the arrival
 *   and departure stretches, moving into the services glides on to the
 *   first (or last) one and moving out is free, so scrolling into or out
 *   of the section is never held.
 * - Page keys. While the stage is pinned, the root's scroll-padding is set
 *   so the browser's own PageDown/PageUp/Space step equals one service
 *   (Chrome pages by 87.5% of the viewport minus scroll-padding). The keys
 *   are never handled or prevented; their native step just lands on the
 *   next service. The padding is removed when the stage unpins and on any
 *   click, so in-page links (#audit, #case-studies) land where they should.
 * - The progress bar width tracks raw progress.
 * - --accent on <html> follows the active panel's colour.
 * - Cursor drift on the index rail (fine pointers only).
 * Under reduced motion the CSS unpins and stacks the panels; nothing runs.
 */
const QUIET_MS = 220;
/** fallback for browsers without `scrollend`: settle after this long idle */
const IDLE_MS = 240;
/** keeps the shown panel steady when a position rests near a boundary */
const DEAD_BAND = 0.04;
/** smaller movements away from a rest are jitter, not a gesture */
const NUDGE_PX = 14;
/**
 * Within this fraction of a service past a rest the view is identical to
 * the rest (transitions start at 12% in), so a scroll ending there stays.
 */
const HOLD = 0.15;
/** Chrome's page step: 87.5% of the viewport (minus scroll-padding) */
const PAGE_FRACTION = 0.875;

export function ServicesScroll() {
  useEffect(() => {
    const track = document.getElementById("wdTrack");
    if (!track) return;
    const panels = Array.from(track.querySelectorAll<HTMLElement>(".wd-panel"));
    const progressFill = document.getElementById("wdProgressFill");
    const n = panels.length;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Server markup already shows panel 0. Starting "active" at 0 skips the
    // reference's initial --accent write: until the first panel change the
    // page accent keeps its token value, which matches panel 0's colour
    // (dot) in the current content. The hero rotor no longer writes the
    // page accent (its colour stays inside the hero), so nothing overrides
    // a panel's colour here.
    let active = 0;
    let ticking = false;
    let lastY = window.scrollY;
    /** direction of the most recent scroll movement: 1 down, -1 up */
    let lastDir = 0;
    /** the rest the current gesture started from; -1 above, n below */
    let origin = 0;
    /** where the glide in flight is heading (-1: none) */
    let glideTo = -1;
    let settleTimer = 0;
    let settleFrame = 0;
    let touching = false;
    /** scroll-padding currently applied for one-service page steps, px */
    let padPx = -1;
    const root = document.documentElement;

    function setActive(i: number) {
      if (i === active) return;
      active = i;
      panels.forEach((p, k) => {
        p.classList.toggle("is-on", k === i);
        p.classList.toggle("is-out", k < i);
      });
      const c = getComputedStyle(panels[i]).getPropertyValue("--c").trim();
      if (c) document.documentElement.style.setProperty("--accent", c);
    }

    /**
     * Continuous position, unclamped: services sit at 0 … n-1, the pinned
     * range runs from -1 (arrival) to n (departure), beyond it is the page.
     */
    function position() {
      const total = track!.offsetHeight - window.innerHeight;
      if (total <= 0 || n < 2) return null;
      const top = track!.getBoundingClientRect().top;
      return {
        s: (-top / total) * (n + 1) - 1,
        top: top + window.scrollY,
        step: total / (n + 1),
      };
    }

    /** one-service page steps while pinned; native steps everywhere else */
    function pageStep(inPin: boolean, step: number) {
      const want = inPin
        ? Math.max(0, Math.round(window.innerHeight - step / PAGE_FRACTION))
        : -1;
      if (want === padPx) return;
      padPx = want;
      if (want < 0) root.style.removeProperty("scroll-padding-top");
      else root.style.setProperty("scroll-padding-top", `${want}px`);
    }

    function read() {
      ticking = false;
      const y = window.scrollY;
      // the latest real movement (ignores sub-pixel jitter at a gesture's end)
      if (Math.abs(y - lastY) > 1.5) {
        lastDir = y > lastY ? 1 : -1;
        lastY = y;
      }
      const pos = position();
      if (!pos) return;
      pageStep(pos.s > -1.002 && pos.s < n + 0.002, pos.step);
      servicesProgress.s = Math.min(n, Math.max(-1, pos.s));
      const s = Math.min(n - 1, Math.max(0, pos.s));
      if (s > active + 0.5 + DEAD_BAND || s < active - 0.5 - DEAD_BAND)
        setActive(Math.min(n - 1, Math.max(0, Math.round(s))));
      servicesProgress.active = active;
      if (progressFill)
        progressFill.style.width = ((s / (n - 1)) * 100).toFixed(2) + "%";
    }

    function settle() {
      if (touching) return;
      const pos = position();
      if (!pos) return;
      const { s, step } = pos;
      // outside the pinned range (or at its very ends): scroll is free
      if (s <= -1 + 0.002 || s >= n - 0.002) {
        origin = s < 0 ? -1 : n;
        glideTo = -1;
        return;
      }
      const near = Math.round(s);
      const arrived = glideTo >= 0 && Math.abs(s - glideTo) * step < 6;
      if (arrived || Math.abs(s - near) * step < 2) {
        origin = arrived ? glideTo : near;
        glideTo = -1;
        return;
      }
      const dir = lastDir || (s > origin ? 1 : -1);
      // the next rest in the direction of travel (never one behind it)
      const ahead = dir > 0 ? Math.ceil(s) : Math.floor(s);
      let target: number;
      if (s < 0 || s > n - 1) {
        // arrival / departure: heading into the services, glide on to the
        // first (or last) one; heading out, the scroll is free
        if (s < 0 ? dir < 0 : dir > 0) {
          origin = s < 0 ? -1 : n;
          glideTo = -1;
          return;
        }
        target = s < 0 ? 0 : n - 1;
      } else if (glideTo >= 0) {
        // scrolled during a glide: further the same way means the service
        // after the glide's; turning back means the nearest one that way
        const glideDir = glideTo > origin ? 1 : -1;
        target =
          dir !== glideDir
            ? ahead
            : dir > 0
              ? Math.max(glideTo + 1, ahead)
              : Math.min(glideTo - 1, ahead);
      } else {
        // a few pixels from where the gesture started: jitter, leave it
        const fromRest = origin >= 0 && origin <= n - 1;
        if (fromRest && Math.abs(s - origin) * step < NUDGE_PX) return;
        // just past a new rest in the direction of travel: the view already
        // shows that service, so stay rather than pull back to it
        const passed = dir > 0 ? Math.floor(s) : Math.ceil(s);
        const isNew =
          dir > 0
            ? passed >= Math.floor(origin) + 1
            : passed <= Math.ceil(origin) - 1;
        if (isNew && Math.abs(s - passed) <= HOLD) {
          origin = passed;
          return;
        }
        // moving away from the start: at least the next service; a gesture
        // that turned back settles on the nearest service its new way
        const away = dir > 0 ? s > origin : s < origin;
        target = !away
          ? ahead
          : dir > 0
            ? Math.max(Math.floor(origin) + 1, ahead)
            : Math.min(Math.ceil(origin) - 1, ahead);
      }
      target = Math.min(n - 1, Math.max(0, target));
      glideTo = target;
      window.scrollTo({
        top: Math.round(pos.top + (target + 1) * step),
        behavior: "smooth",
      });
    }

    function cancelSettle() {
      if (settleTimer) window.clearTimeout(settleTimer);
      if (settleFrame) cancelAnimationFrame(settleFrame);
      settleTimer = 0;
      settleFrame = 0;
    }

    function armSettle(ms: number) {
      cancelSettle();
      const at = window.scrollY;
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        // A gesture that began just now may be moving on the compositor
        // before this thread hears of it; two frames later it has. Glide
        // only if nothing moved since the scroll ended (otherwise that
        // gesture gets its own scrollend and is settled then).
        settleFrame = requestAnimationFrame(() => {
          settleFrame = requestAnimationFrame(() => {
            settleFrame = 0;
            if (Math.abs(window.scrollY - at) <= 0.5) settle();
          });
        });
      }, ms);
    }

    const hasScrollEnd = "onscrollend" in window;

    function onScroll() {
      // any movement means the gesture is still going: wait for its end
      if (hasScrollEnd) cancelSettle();
      else armSettle(IDLE_MS);
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(read);
      }
    }
    const onScrollEnd = () => armSettle(QUIET_MS);
    const onPointerDown = () => cancelSettle();
    // before a link is followed (mouse, touch or keyboard activation):
    // drop the page-step padding so in-page targets land as normal...
    const onClick = () => pageStep(false, 0);
    // ...and restore it before a key's own scroll is computed. Keys are
    // only observed here: nothing is handled or prevented.
    const onKeyDown = () => {
      const pos = position();
      if (pos) pageStep(pos.s > -1.002 && pos.s < n + 0.002, pos.step);
    };
    const onTouchStart = () => {
      touching = true;
      cancelSettle();
    };
    const onTouchEnd = () => {
      touching = false;
      if (!hasScrollEnd) armSettle(IDLE_MS);
    };

    if (reduce) return;

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    if (hasScrollEnd) addEventListener("scrollend", onScrollEnd);
    addEventListener("pointerdown", onPointerDown, { passive: true });
    addEventListener("click", onClick, { capture: true, passive: true });
    addEventListener("keydown", onKeyDown, { capture: true, passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("touchcancel", onTouchEnd, { passive: true });
    read();
    const start = position();
    if (start)
      origin = start.s < 0 ? -1 : start.s > n - 1 ? n : Math.round(start.s);

    // index rail cursor drift
    const cleanups: (() => void)[] = [];
    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    const stage = track.querySelector<HTMLElement>(".wd-stage");
    const rail = track.querySelector<HTMLElement>(".wd-rail");
    if (canHover && stage && rail) {
      const move = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rail.style.setProperty("--px", (px * -16).toFixed(2));
        rail.style.setProperty("--py", (py * -16).toFixed(2));
      };
      const leave = () => {
        rail.style.setProperty("--px", "0");
        rail.style.setProperty("--py", "0");
      };
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        stage.removeEventListener("pointermove", move);
        stage.removeEventListener("pointerleave", leave);
      });
    }

    return () => {
      cancelSettle();
      pageStep(false, 0);
      removeEventListener("click", onClick, { capture: true });
      removeEventListener("keydown", onKeyDown, { capture: true });
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      removeEventListener("scrollend", onScrollEnd);
      removeEventListener("pointerdown", onPointerDown);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchend", onTouchEnd);
      removeEventListener("touchcancel", onTouchEnd);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
