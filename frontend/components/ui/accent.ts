import type { CSSProperties } from "react";
import type { AccentSlot } from "@/types/home";

/** `style="--c:var(--dot)"` from the reference, typed for React. */
export function accentStyle(slot: AccentSlot): CSSProperties {
  return { "--c": `var(--${slot})` } as CSSProperties;
}

/** Any CSS custom property as an inline style. */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
