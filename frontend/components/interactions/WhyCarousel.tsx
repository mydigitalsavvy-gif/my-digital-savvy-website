"use client";

import { useEffect } from "react";

/**
 * Port of the Why Us carousel script: native horizontal scroll-snap does
 * the moving; this keeps the dots and "NN / 12" counter in sync, wires
 * the arrow buttons and Left/Right keys, and scrolls smoothly to a card.
 */
export function WhyCarousel() {
  useEffect(() => {
    const track = document.getElementById("whyTrack");
    const list = document.getElementById("whyList");
    if (!track || !list) return;
    const cards = Array.from(list.children) as HTMLElement[];
    const dots = Array.from(
      document.getElementById("whyDots")?.children ?? []
    ) as HTMLElement[];
    const countEl = document.getElementById("whyCount");
    const prevBtn = document.getElementById("whyPrev");
    const nextBtn = document.getElementById("whyNext");
    const n = cards.length;

    const currentIndex = () => {
      const scrollLeft = track.scrollLeft;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const dist = Math.abs(c.offsetLeft - list.offsetLeft - scrollLeft);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    };

    const paint = () => {
      const i = currentIndex();
      dots.forEach((d, k) => d.classList.toggle("is-on", k === i));
      if (countEl)
        countEl.textContent = (i + 1 < 10 ? "0" : "") + (i + 1) + " / " + n;
    };

    const goTo = (i: number) => {
      i = Math.max(0, Math.min(n - 1, i));
      const card = cards[i];
      track.scrollTo({
        left: card.offsetLeft - list.offsetLeft,
        behavior: "smooth",
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          paint();
          ticking = false;
        });
      }
    };
    const onPrev = () => goTo(currentIndex() - 1);
    const onNext = () => goTo(currentIndex() + 1);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(currentIndex() + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(currentIndex() - 1);
      }
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    prevBtn?.addEventListener("click", onPrev);
    nextBtn?.addEventListener("click", onNext);
    track.addEventListener("keydown", onKey);
    paint();

    return () => {
      track.removeEventListener("scroll", onScroll);
      prevBtn?.removeEventListener("click", onPrev);
      nextBtn?.removeEventListener("click", onNext);
      track.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
