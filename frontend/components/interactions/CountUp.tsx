"use client";

import { useEffect, useRef } from "react";

/**
 * Port of countUpOnView(): counts 0 → target with an ease-out cubic over
 * 1.4s once `rootId` is half visible. Server markup shows "0" exactly like
 * the reference; any failure resolves straight to the real value.
 */
export function CountUp({
  target,
  rootId,
  id,
  as: Tag = "span",
  duration = 1400,
  threshold = 0.5,
}: {
  target: number;
  rootId?: string;
  id?: string;
  as?: "span" | "strong";
  duration?: number;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const root = (rootId && document.getElementById(rootId)) || el;
    if (!("IntersectionObserver" in window)) {
      el.textContent = String(target);
      return;
    }
    let done = false;
    let raf = 0;
    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting || done) return;
          done = true;
          if (reduce) {
            el.textContent = String(target);
            return;
          }
          let start: number | null = null;
          const step = (ts: number) => {
            if (start === null) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const e = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(e * target));
            if (p < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        },
        { threshold }
      );
      observer.observe(root);
    } catch {
      el.textContent = String(target);
    }
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, rootId, duration, threshold]);

  // Text is driven imperatively after mount; React never re-renders it.
  return (
    <Tag
      ref={ref as React.RefObject<HTMLSpanElement>}
      id={id}
      suppressHydrationWarning
    >
      0
    </Tag>
  );
}
