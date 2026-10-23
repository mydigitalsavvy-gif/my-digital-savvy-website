/**
 * Motion (motion/react) timing tokens. Kept numerically identical to the
 * --mds-ease-reveal / --mds-ease-out CSS custom properties in
 * app/globals.css — CSS transitions take a cubic-bezier() string, Motion
 * takes a 4-number array, so the same curve needs both shapes rather than
 * one canonical source. If the curve changes, update both.
 */

export const easeReveal = [0.16, 0.84, 0.28, 1] as const;
export const easeOut = [0.16, 0.84, 0.28, 1] as const;

export const duration = {
  /** Micro-interactions: hover states, button feedback, cursor-driven parallax. */
  fast: 0.2,
  /** Section reveals, panel transitions. */
  base: 0.5,
  /** Large transform/translate entrances (e.g. growth-system card slide). */
  slow: 0.75,
} as const;

/** Standard fade + rise entrance, gated by prefers-reduced-motion at the call site. */
export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.base, ease: easeReveal },
};

/** Stagger delay (seconds) for grouped reveal children — mirrors .reveal-group's CSS delays. */
export const staggerChildren = 0.08;
