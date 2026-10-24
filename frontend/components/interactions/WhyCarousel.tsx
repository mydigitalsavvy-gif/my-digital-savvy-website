"use client";

import { useEffect } from "react";

/** Dwell time per card — slow enough to read, not a distraction. */
const AUTOPLAY_MS = 5000;

/**
 * Native horizontal scroll-snap does the moving; this keeps the "NN / 12"
 * counter in sync, wires the arrow buttons and Left/Right keys, and
 * scrolls smoothly to a card — plus a gentle autoplay.
 *
 * Autoplay only runs while: reduced motion isn't requested, the carousel
 * is actually on screen (IntersectionObserver), and the visitor hasn't
 * touched it yet. The first touch/drag, wheel scroll, arrow click, arrow
 * key, or focus into the region turns autoplay off for good — once
 * someone's in control, it never jumps the card out from under them
 * again. Manual navigation (buttons, keys, drag) is the same `goTo` path
 * autoplay uses, so it keeps working identically before and after.
 */
export function WhyCarousel() {
  useEffect(() => {
    const track = document.getElementById("whyTrack");
    const list = document.getElementById("whyList");
    if (!track || !list) return;
    const cards = Array.from(list.children) as HTMLElement[];
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
      if (countEl)
        countEl.textContent = (i + 1 < 10 ? "0" : "") + (i + 1) + " / " + n;
    };

    /** wrap=true loops past the last card to the first, for autoplay. */
    const goTo = (i: number, wrap = false) => {
      i = wrap ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
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

    // ── autoplay: start only when visible, stop for good on interaction
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let timer = 0;
    let userInteracted = false;
    let inView = false;

    const stopAutoplay = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
    const startAutoplay = () => {
      if (reduce || userInteracted || !inView || timer) return;
      timer = window.setInterval(
        () => goTo(currentIndex() + 1, true),
        AUTOPLAY_MS
      );
    };
    const interact = () => {
      if (userInteracted) return;
      userInteracted = true;
      stopAutoplay();
    };

    const onPrev = () => {
      interact();
      goTo(currentIndex() - 1);
    };
    const onNext = () => {
      interact();
      goTo(currentIndex() + 1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        interact();
        goTo(currentIndex() + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        interact();
        goTo(currentIndex() - 1);
      }
    };

    let io: IntersectionObserver | null = null;
    if (!reduce) {
      io = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          if (inView) startAutoplay();
          else stopAutoplay();
        },
        { threshold: 0.4 }
      );
      io.observe(track);
    }

    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("pointerdown", interact, { passive: true });
    track.addEventListener("wheel", interact, { passive: true });
    track.addEventListener("focusin", interact);
    prevBtn?.addEventListener("click", onPrev);
    nextBtn?.addEventListener("click", onNext);
    track.addEventListener("keydown", onKey);
    paint();

    return () => {
      stopAutoplay();
      io?.disconnect();
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("pointerdown", interact);
      track.removeEventListener("wheel", interact);
      track.removeEventListener("focusin", interact);
      prevBtn?.removeEventListener("click", onPrev);
      nextBtn?.removeEventListener("click", onNext);
      track.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
