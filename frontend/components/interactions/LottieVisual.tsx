"use client";

import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

/**
 * Decorative Lottie animation from /public/lottie (built by
 * scripts/lottie/build-lottie.mjs).
 *
 * - The player (lottie-web light, SVG only) is loaded lazily, the first
 *   time the element comes near the viewport, so it never weighs on the
 *   initial page load.
 * - Plays only while on screen. With `gate`, it additionally waits until
 *   the closest ancestor matching that selector has `.is-on` (the growth
 *   stages), and restarts from frame 0 each time that stage comes up, so
 *   every stage tells its story from the start.
 * - Reduced motion: renders one finished frame (`still`) and never plays.
 * - The box reserves its aspect ratio up front, so nothing shifts.
 *
 * Accent colour comes from CSS (--lot-acc), see 32-visuals.css.
 */
export function LottieVisual({
  name,
  width,
  height,
  still,
  gate,
  className,
}: {
  name: string;
  width: number;
  height: number;
  /** frame shown under prefers-reduced-motion */
  still: number;
  gate?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Gating only applies where the stage script runs (desktop, motion on);
    // on phones the stages are stacked and each simply plays in view.
    const gateEl =
      gate && !reduce && window.matchMedia("(min-width: 861px)").matches
        ? (el.closest(gate) as HTMLElement | null)
        : null;

    let anim: AnimationItem | null = null;
    let disposed = false;
    let inView = false;
    let gateOn = gateEl ? gateEl.classList.contains("is-on") : true;
    let loading = false;

    const sync = (restart = false) => {
      if (!anim || reduce) return;
      if (inView && gateOn) {
        if (restart) anim.goToAndPlay(0, true);
        else anim.play();
      } else anim.pause();
    };

    const load = async () => {
      if (loading) return;
      loading = true;
      const { default: lottie } =
        await import("lottie-web/build/player/lottie_light");
      if (disposed) return;
      anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: !reduce,
        autoplay: false,
        path: `/lottie/${name}.json`,
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: true,
        },
      });
      anim.addEventListener("DOMLoaded", () => {
        el.dataset.ready = "1";
        if (reduce) anim?.goToAndStop(still, true);
        else sync(true);
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void load();
        const was = inView;
        inView = entry.isIntersecting;
        if (was !== inView) sync(false);
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(el);

    let mo: MutationObserver | null = null;
    if (gateEl) {
      mo = new MutationObserver(() => {
        const on = gateEl.classList.contains("is-on");
        if (on === gateOn) return;
        gateOn = on;
        sync(on);
      });
      mo.observe(gateEl, { attributes: true, attributeFilter: ["class"] });
    }

    return () => {
      disposed = true;
      io.disconnect();
      mo?.disconnect();
      anim?.destroy();
    };
  }, [name, still, gate]);

  return (
    <div
      ref={ref}
      className={className ? `lottie ${className}` : "lottie"}
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-hidden="true"
    />
  );
}
