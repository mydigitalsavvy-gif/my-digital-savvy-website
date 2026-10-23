"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/track";

/**
 * Page-wide behaviours from the reference script, re-bound per route:
 *  - scroll reveal (.reveal / .reveal-group gain .in once 10% visible)
 *  - hero dot-grid cursor parallax (--mx / --my on .hero)
 *  - magnetic pull on primary CTAs (.btn.solid)
 *  - click analytics (dataLayer only; see lib/analytics/track.ts)
 * Pointer effects are gated on reduced motion AND a real hover pointer,
 * exactly like the reference, so touch never gets a stuck transform.
 */
export function PageEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof HTMLElementEventMap>(
      el: HTMLElement,
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void
    ) => {
      el.addEventListener(type, fn);
      cleanups.push(() => el.removeEventListener(type, fn));
    };

    // ── scroll reveal
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document
      .querySelectorAll(".reveal, .reveal-group")
      .forEach((el) => revealObserver.observe(el));
    cleanups.push(() => revealObserver.disconnect());

    // ── pointer micro-interactions
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const canHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    if (!reduce && canHover) {
      const hero = document.querySelector<HTMLElement>(".hero");
      if (hero) {
        on(hero, "pointermove", (e) => {
          const r = hero.getBoundingClientRect();
          hero.style.setProperty(
            "--mx",
            ((e.clientX - r.left) / r.width).toFixed(3)
          );
          hero.style.setProperty(
            "--my",
            ((e.clientY - r.top) / r.height).toFixed(3)
          );
        });
        on(hero, "pointerleave", () => {
          hero.style.setProperty("--mx", "0.5");
          hero.style.setProperty("--my", "0.5");
        });
      }

      const MAGNET_STRENGTH = 0.25;
      const MAGNET_MAX = 10;
      document.querySelectorAll<HTMLElement>(".btn.solid").forEach((btn) => {
        on(btn, "pointermove", (e) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const tx = Math.max(
            -MAGNET_MAX,
            Math.min(MAGNET_MAX, dx * MAGNET_STRENGTH)
          );
          const ty = Math.max(
            -MAGNET_MAX,
            Math.min(MAGNET_MAX, dy * MAGNET_STRENGTH)
          );
          btn.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
        });
        on(btn, "pointerleave", () => {
          btn.style.transform = "";
        });
      });
    }

    // ── click analytics. The reference fired a Meta "Lead" on every CTA
    // click; that inflates conversions, so CTA clicks are tracked as clicks.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("https://wa.me/")) track("whatsapp_click", { href });
      else if (href.startsWith("tel:")) track("phone_click", { href });
      else if (/#(contact|audit)$/.test(href)) {
        track("cta_click", {
          label: a.textContent?.trim(),
          href,
          location:
            a.closest("section, header, footer")?.id ||
            a.closest("header, footer")?.tagName.toLowerCase(),
        });
      }
    };
    document.addEventListener("click", onClick);
    cleanups.push(() => document.removeEventListener("click", onClick));

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
