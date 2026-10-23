"use client";

import { useEffect, useRef } from "react";
import type { SolarEngine } from "@/lib/solar-system/engine";
import { servicesProgress } from "@/components/sections/services/servicesProgress";

/**
 * The services index (01–09) drawn as the Sun and the eight planets; see
 * lib/solar-system. Service 01 is the Sun, 02 Mercury … 09 Neptune.
 *
 * - No state of its own: the active service is read from the `.is-on`
 *   class ServicesScroll already toggles on the panels (a MutationObserver
 *   on those panels), and its colour from that panel's own --c. Nothing is
 *   written to the page or to <html>.
 * - The renderer is a separate chunk, loaded only when the services
 *   section comes within ~600px of the viewport.
 * - It animates only while the section is on screen and the tab visible;
 *   all per-frame values stay inside the renderer, so React never
 *   re-renders for the animation.
 * - Reduced motion: one static frame, redrawn only on resize.
 * - Keeps the old rail's class so ServicesScroll's cursor drift still
 *   applies. Decorative, like the old index: the panels carry the content.
 */
export function SolarSystemNav({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const stage = (el.closest(".wd-stage") as HTMLElement | null) ?? el;
    const scope = el.closest("#wdTrack") ?? document;
    const panels = Array.from(scope.querySelectorAll<HTMLElement>(".wd-panel"));
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let engine: SolarEngine | null = null;
    const devPin = { s: NaN };
    let disposed = false;
    let loading = false;
    let inView = false;

    const readActive = () => {
      const i = panels.findIndex((p) => p.classList.contains("is-on"));
      const color =
        i >= 0 ? getComputedStyle(panels[i]).getPropertyValue("--c") : "";
      return { i, color };
    };

    const sync = () => {
      if (!engine) return;
      if (reduce) return;
      if (inView && !document.hidden) engine.start();
      else engine.stop();
    };

    const load = async () => {
      if (loading) return;
      loading = true;
      const { createSolarSystem } = await import("@/lib/solar-system/engine");
      if (disposed) return;
      engine = createSolarSystem(canvas, {
        count,
        reducedMotion: reduce,
        fontFamily: getComputedStyle(el).fontFamily,
        // phones: 30fps is plenty for slow orbits and halves the work
        lowPower: window.matchMedia("(pointer: coarse), (max-width: 860px)")
          .matches,
        // the camera follows the scroll position ServicesScroll publishes
        // (development builds can pin it for visual checks; see below)
        progress: reduce
          ? undefined
          : process.env.NODE_ENV !== "production"
            ? () => (Number.isNaN(devPin.s) ? servicesProgress.s : devPin.s)
            : () => servicesProgress.s,
        colors: panels.map((p) =>
          getComputedStyle(p).getPropertyValue("--c").trim()
        ),
      });
      const box = el.getBoundingClientRect();
      engine.resize(box.width, box.height);
      const a = readActive();
      engine.setActive(a.i, a.color);
      el.dataset.ready = "1";
      if (process.env.NODE_ENV !== "production") {
        (el as HTMLElement & { __solar?: SolarEngine }).__solar = engine;
        (el as HTMLElement & { __solarPin?: { s: number } }).__solarPin =
          devPin;
      }
      sync();
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void load();
      },
      { rootMargin: "600px 0px" }
    );
    near.observe(stage);

    const visible = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    visible.observe(stage);

    const resize = new ResizeObserver(([entry]) => {
      engine?.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resize.observe(el);

    const classes = new MutationObserver(() => {
      const a = readActive();
      engine?.setActive(a.i, a.color);
    });
    for (const p of panels)
      classes.observe(p, { attributes: true, attributeFilter: ["class"] });

    document.addEventListener("visibilitychange", sync);

    return () => {
      disposed = true;
      near.disconnect();
      visible.disconnect();
      resize.disconnect();
      classes.disconnect();
      document.removeEventListener("visibilitychange", sync);
      engine?.destroy();
      engine = null;
    };
  }, [count]);

  return (
    <div ref={ref} className="wd-rail ss-nav" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
