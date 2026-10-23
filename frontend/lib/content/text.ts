import type { ContentBlock, Inline } from "@/types/content";

/** Plain text of inline content (schema, meta fallbacks). Pure: safe anywhere. */
export function inlinesToText(items: Inline[]): string {
  return items
    .map((i) =>
      i.type === "text"
        ? i.text
        : i.type === "break"
          ? " "
          : "children" in i
            ? inlinesToText(i.children)
            : ""
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function blocksToText(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
        case "paragraph":
        case "quote":
          return inlinesToText(b.content);
        case "list":
          return b.items.map(inlinesToText).join("; ");
        case "steps":
          return b.items
            .map((s) => `${s.title}: ${blocksToText(s.body)}`)
            .join(" ");
        case "image":
          return "";
        case "cards":
          return b.items
            .map((c) =>
              [c.title, inlinesToText(c.body)].filter(Boolean).join(": ")
            )
            .join("; ");
      }
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** First sentence-ish slice for description fallbacks. */
export function summarize(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "") + "…";
}
