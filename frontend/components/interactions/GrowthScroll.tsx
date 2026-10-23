"use client";

import { useEffect } from "react";

/**
 * Port of the growth-system scroll script: progress through #growthTrack
 * selects one of six stages; cards slide/scale via CSS classes, the rail
 * marks the current stage and dims passed ones. Disabled on mobile and
 * under reduced motion, where the CSS stacks the cards instead.
 */
export function GrowthScroll() {
  useEffect(() => {
    const track = document.getElementById("growthTrack");
    if (!track) return;
    const cards = Array.from(
      track.querySelectorAll<HTMLElement>(".growth-card")
    );
    const rail = Array.from(
      track.querySelectorAll<HTMLElement>("#growthRail li")
    );
    const n = cards.length;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    let active = 0; // server markup already shows stage 0
    let ticking = false;

    function setActive(i: number) {
      if (i === active) return;
      active = i;
      cards.forEach((c, k) => {
        c.classList.toggle("is-on", k === i);
        c.classList.toggle("is-out", k < i);
      });
      rail.forEach((r, k) => {
        r.classList.toggle("is-on", k === i);
        r.classList.toggle("is-done", k < i);
      });
    }

    function read() {
      ticking = false;
      const rect = track!.getBoundingClientRect();
      const total = track!.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = Math.min(1, Math.max(0, -rect.top / total));
      setActive(Math.min(n - 1, Math.floor(p * n)));
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(read);
      }
    }

    if (reduce || isMobile) return;
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    read();
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);

  return null;
}
