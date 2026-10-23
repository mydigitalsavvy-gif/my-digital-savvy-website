"use client";

import { useEffect, useRef } from "react";
import type { Orrery } from "@/lib/solar-system/orrery";
import { track } from "@/lib/analytics/track";

/**
 * The live solar system in "Our work" (see lib/solar-system/orrery.ts):
 * the planets start where they really are today and run as a time-lapse.
 *
 * - Draws only. The link around it (PortfolioSystem) does the navigation,
 *   so a click anywhere on the system (a planet, a moon, an orbit, the
 *   stars) opens the portfolio, and it does so before this code has run.
 * - The renderer is a separate chunk, loaded only when the section comes
 *   within ~600px of the viewport.
 * - It animates only while on screen and the tab is visible; per-frame
 *   values stay inside the renderer, so React never re-renders for it.
 * - Fine pointers (mouse, pen): hovering a body slows time, brings it
 *   forward and names it, and the plane tilts a little with the pointer.
 *   Touch screens and phones get the system running on its own.
 * - Reduced motion: one static frame, redrawn on resize and hover.
 */
export function PortfolioOrrery({ live }: { live: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dateRef = useRef<HTMLTimeElement>(null);

  useEffect(() => {
    const el = ref.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const link = el.closest("a");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // the day the planets start from, shown in the caption (client side,
    // so it is the visitor's today, not the day the page was built)
    const day = new Date();
    if (dateRef.current) {
      dateRef.current.dateTime = day.toISOString().slice(0, 10);
      dateRef.current.textContent = day.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    let engine: Orrery | null = null;
    let disposed = false;
    let loading = false;
    let inView = false;

    const sync = () => {
      if (!engine || reduce) return;
      if (inView && !document.hidden) engine.start();
      else engine.stop();
    };

    const load = async () => {
      if (loading) return;
      loading = true;
      const { createOrrery } = await import("@/lib/solar-system/orrery");
      if (disposed) return;
      const style = getComputedStyle(el);
      engine = createOrrery(canvas, {
        reducedMotion: reduce,
        // phones: 30fps, fewer moons and rocks, no hover
        lowPower: window.matchMedia("(pointer: coarse), (max-width: 860px)")
          .matches,
        fontFamily: style.fontFamily,
        highlight: style.getPropertyValue("--dot").trim() || "#01FEFB",
        date: day,
      });
      const box = el.getBoundingClientRect();
      engine.resize(box.width, box.height);
      el.dataset.ready = "1";
      if (process.env.NODE_ENV !== "production")
        (el as HTMLElement & { __orrery?: Orrery }).__orrery = engine;
      sync();
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void load();
      },
      { rootMargin: "600px 0px" }
    );
    near.observe(el);

    const visible = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    visible.observe(el);

    const resize = new ResizeObserver(([entry]) => {
      engine?.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resize.observe(el);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = canvas.getBoundingClientRect();
      engine?.pointer(e.clientX - r.left, e.clientY - r.top);
    };
    const onLeave = () => engine?.pointer(null, null);
    const onClick = () => {
      track("portfolio_click", {
        target: engine?.snapshot().hovered ?? "system",
        href: link?.getAttribute("href") ?? "",
      });
    };
    link?.addEventListener("pointermove", onMove);
    link?.addEventListener("pointerleave", onLeave);
    link?.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", sync);

    return () => {
      disposed = true;
      near.disconnect();
      visible.disconnect();
      resize.disconnect();
      link?.removeEventListener("pointermove", onMove);
      link?.removeEventListener("pointerleave", onLeave);
      link?.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", sync);
      engine?.destroy();
      engine = null;
    };
  }, []);

  return (
    <div ref={ref} className="orrery-stage">
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="orrery-live label" aria-hidden="true">
        <i />
        {live} <time ref={dateRef}>today</time>
      </span>
    </div>
  );
}
