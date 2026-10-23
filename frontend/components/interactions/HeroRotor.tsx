"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

type Word = { word: string; color: string };

/* One word's timeline, in ms. Deliberately slower and softer than the
   reference (3.2s loop, hard text swap, 1.1s fill); the matching CSS is
   the "hero rotor motion" block in 32-visuals.css.
     0      .is-out: the coloured word drifts up and fades out  (OUT_MS)
     500    swap the text while invisible, jump below (.is-below), rise in
     1000   .go: its colour slowly fills up through it          (FILL_MS)
     6000   fully coloured: a short beat                        (HOLD_MS)
     6500   next word */
const OUT_MS = 500; // = the .is-out transition duration in CSS
const FILL_DELAY_MS = 500; // from the start of the rise to the fill
const FILL_MS = 5000; // = the .go .fill transition duration in CSS
const HOLD_MS = 500; // the finished word, before it leaves
const CYCLE_MS = OUT_MS + FILL_DELAY_MS + FILL_MS + HOLD_MS;
const FIRST_FILL_MS = 500; // first word is server-rendered; fill it once settled

/**
 * Port of the reference word rotor, re-timed (see above). Each word is
 * announced to the polite live region when it swaps in.
 *
 * The active word's colour is hero-only state: when its colour starts to
 * fill, it is written to --hero-accent on the hero section, and nowhere
 * else (the reference wrote --accent on <html>, which leaked into the
 * services and every later section). That one property is the single
 * source for the colour: the word fill and the hero chart both read it
 * from CSS (see "hero accent" in 32-visuals.css), so they can't disagree.
 *
 * The button is sized once to the widest word so the line never reflows.
 * Motion classes are toggled directly on the rotor (React leaves its
 * static className alone) so each phase can be committed before the next
 * one animates.
 */
export function HeroRotor({
  words,
  initialLabel,
}: {
  words: Word[];
  initialLabel: string;
}) {
  const rotorRef = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);
  const [minWidth, setMinWidth] = useState<number | undefined>(undefined);
  const [label, setLabel] = useState(initialLabel);

  // reserveWidth(): measure every word on a hidden clone, never on React's own nodes.
  // Re-measured once web fonts are ready, so the reserve always reflects
  // Inter rather than whichever fallback happened to be on screen first.
  useLayoutEffect(() => {
    const measure = () => {
      const rotor = rotorRef.current;
      if (!rotor || !rotor.parentElement) return undefined;
      const clone = rotor.cloneNode(true) as HTMLSpanElement;
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      clone.style.position = "absolute";
      clone.style.visibility = "hidden";
      clone.style.pointerEvents = "none";
      clone.setAttribute("aria-hidden", "true");
      const btn = clone.querySelector("button")!;
      btn.style.minWidth = "";
      const base = clone.querySelector(".base")!;
      rotor.parentElement.appendChild(clone);
      let maxW = 0;
      for (const w of words) {
        base.textContent = w.word;
        const dot = document.createElement("span");
        dot.className = "crimson";
        dot.textContent = ".";
        base.appendChild(dot);
        maxW = Math.max(maxW, btn.offsetWidth);
      }
      clone.remove();
      return maxW;
    };
    let cancelled = false;
    setMinWidth(measure());
    document.fonts?.ready.then(() => {
      if (!cancelled) setMinWidth(measure());
    });
    return () => {
      cancelled = true;
    };
  }, [words]);

  useEffect(() => {
    const rotor = rotorRef.current;
    if (!rotor) return;
    // the element that owns the hero accent; never the document root
    const scope = rotor.closest<HTMLElement>(".hero") ?? rotor;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const announce = (n: number) => {
      const d = words[n];
      setLabel(`See how we help ${d.word} businesses`);
      const live = document.getElementById("srLive");
      if (live) {
        live.textContent = "";
        live.textContent = d.word;
      }
    };
    const fill = (n: number) => {
      scope.style.setProperty("--hero-accent", words[n].color);
      rotor.classList.add("go");
    };

    let idx = 0;
    const next = () => {
      const n = (idx + 1) % words.length;
      rotor.classList.add("is-out");
      later(() => {
        idx = n;
        // swap the text while it's invisible, synchronously, so the new
        // word is in the DOM before it starts to rise
        flushSync(() => setCurrent(n));
        announce(n);
        // jump below with the fill emptied (no transition), commit that
        // state with a forced layout, then let it rise into place
        rotor.classList.remove("is-out", "go");
        rotor.classList.add("is-below");
        rotor.getBoundingClientRect();
        rotor.classList.remove("is-below");
        later(() => fill(n), FILL_DELAY_MS);
        later(next, CYCLE_MS - OUT_MS);
      }, OUT_MS);
    };

    // The first word is already on screen from the server render. Deferred
    // so no state is set synchronously inside the effect.
    later(
      () => {
        setCurrent(0);
        announce(0);
        fill(0);
        if (!reduce) later(next, CYCLE_MS - OUT_MS - FILL_DELAY_MS);
      },
      reduce ? 0 : FIRST_FILL_MS
    );

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      rotor.classList.remove("go", "is-out", "is-below");
      scope.style.removeProperty("--hero-accent");
    };
  }, [words]);

  const d = words[current];
  return (
    <span className="rotor" id="rotor" ref={rotorRef}>
      <button
        type="button"
        id="rotorBtn"
        aria-label={label}
        style={minWidth ? { minWidth } : undefined}
        onClick={() => {
          const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches;
          document
            .getElementById("services")
            ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        }}
      >
        <span className="base" id="rotorBase">
          {d.word}
          <span className="crimson">.</span>
        </span>
        <span className="fill" id="rotorFill" aria-hidden="true">
          {/* colour comes from --hero-accent (32-visuals.css) */}
          <span id="rotorTop">
            {d.word}
            <span className="crimson">.</span>
          </span>
        </span>
      </button>
    </span>
  );
}
