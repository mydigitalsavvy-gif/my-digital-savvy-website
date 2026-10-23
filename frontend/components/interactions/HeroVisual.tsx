"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { LottieVisual } from "@/components/interactions/LottieVisual";

const W = 360;
const H = 320;
const MIN_W = 210;
const MAX_W = 380;
const GAP = 28;

type Box = { top: number; left: number; width: number } | null;

/**
 * Hero ROI illustration, placed in the largest clear area beside the
 * headline. The headline's line breaks change with viewport width (and
 * the rotor reserves room for its widest word), so the free space moves:
 * sometimes it's above the first line, sometimes to the right of the
 * lower lines. This measures the real line boxes and picks the bigger
 * region; if neither fits the minimum size, the visual stays hidden
 * rather than crowding the headline.
 */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const hero = el?.closest(".hero") as HTMLElement | null;
    if (!el || !hero) return;
    const h1 = hero.querySelector("h1");
    const eyebrow = hero.querySelector(".eyebrow");
    const btns = hero.querySelector(".btns");
    const rotor = hero.querySelector("#rotor");
    if (!h1 || !eyebrow || !btns) return;

    const measure = () => {
      if (!window.matchMedia("(min-width: 1100px)").matches)
        return setBox(null);
      const hr = hero.getBoundingClientRect();
      const right = hr.right - parseFloat(getComputedStyle(hero).paddingRight);

      // headline rows: text line boxes plus the rotor's reserved width
      const range = document.createRange();
      range.selectNodeContents(h1);
      const rects = [...range.getClientRects()];
      if (rotor) rects.push(rotor.getBoundingClientRect());
      const rows: { top: number; bottom: number; right: number }[] = [];
      for (const r of rects) {
        if (r.width < 2) continue;
        const row = rows.find((x) => Math.abs(x.top - r.top) < 20);
        if (row) {
          row.right = Math.max(row.right, r.right);
          row.bottom = Math.max(row.bottom, r.bottom);
        } else rows.push({ top: r.top, bottom: r.bottom, right: r.right });
      }
      rows.sort((a, b) => a.top - b.top);
      if (!rows.length) return setBox(null);

      // the eyebrow row is full width; only its text occupies space
      const eRange = document.createRange();
      eRange.selectNodeContents(eyebrow);
      const er = eRange.getBoundingClientRect();
      const br = btns.getBoundingClientRect();
      const candidates: { top: number; bottom: number; left: number }[] = [
        // above the first line, right of the eyebrow
        {
          top: hr.top + 16,
          bottom: Math.min(rows[0].top, er.top) - 12,
          left: er.right + GAP * 2,
        },
      ];
      // right of rows s..end, from just below row s-1 down to the buttons
      for (let s = 0; s < rows.length; s++) {
        candidates.push({
          top: s === 0 ? hr.top + 16 : rows[s - 1].bottom + 8,
          bottom: br.top - 16,
          left: Math.max(...rows.slice(s).map((r) => r.right)) + GAP,
        });
      }

      let best: Box = null;
      for (const c of candidates) {
        const w = Math.min(MAX_W, right - c.left, ((c.bottom - c.top) * W) / H);
        if (w < MIN_W || (best && w <= best.width)) continue;
        const h = (w * H) / W;
        best = {
          width: Math.round(w),
          left: Math.round(right - w - hr.left),
          top: Math.round(c.top + (c.bottom - c.top - h) / 2 - hr.top),
        };
      }
      setBox(best);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hero);
    if (rotor) ro.observe(rotor);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="hero-visual"
      style={
        box
          ? { top: box.top, left: box.left, width: box.width }
          : { visibility: "hidden" }
      }
    >
      {box && <LottieVisual name="hero-roi" width={W} height={H} still={160} />}
    </div>
  );
}
