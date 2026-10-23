/* Pure (no server-only): shared by the site adapters and the migration scripts. */
import type { ContentBlock, Inline } from "@/types/content";
import { inlineText } from "./html-blocks";

/**
 * Hero for a legacy page. The page H1 is ranking text, so it is kept:
 *  - the WordPress <h1> becomes the hero H1 (when Elementor emitted
 *    several, the one closest to the Yoast title wins; the others stay
 *    in the body as H2s, since a page may only have one H1)
 *  - no <h1> in the content → the WordPress page title
 * A paragraph that opens the content becomes the hero intro.
 */
export function splitHero(
  blocks: ContentBlock[],
  fallbackTitle: string,
  yoastTitle?: string | null
) {
  const body = [...blocks];
  let heading = fallbackTitle;
  let intro: Inline[] = [];

  const words = (s: string) =>
    new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const target = words(yoastTitle || fallbackTitle);
  const score = (s: string) =>
    [...words(s)].filter((w) => target.has(w)).length;

  const h1s = body
    .map((b, i) => ({ b, i }))
    .filter((x) => x.b.type === "heading" && x.b.fromH1);
  if (h1s.length) {
    const best = h1s.reduce((a, c) =>
      c.b.type === "heading" &&
      a.b.type === "heading" &&
      score(inlineText(c.b.content)) > score(inlineText(a.b.content))
        ? c
        : a
    );
    if (best.b.type === "heading")
      heading = inlineText(best.b.content) || fallbackTitle;
    body.splice(best.i, 1);
  }
  if (body[0]?.type === "paragraph") {
    intro = body[0].content;
    body.splice(0, 1);
  }
  return { heading, intro, body };
}
