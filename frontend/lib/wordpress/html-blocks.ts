/* Pure parser (no server-only guard): also used by scripts/migration. */
import { parse, NodeType, type HTMLElement, type Node } from "node-html-parser";
import type {
  CardItem,
  ContentBlock,
  Faq,
  ImageAsset,
  Inline,
} from "@/types/content";
import { toInternalPath } from "@/lib/site";

/**
 * WordPress/Elementor HTML → typed content blocks.
 *
 * This is an adapter, not a renderer: it keeps the editorial content
 * (headings, paragraphs, lists, images, tab/accordion text) and discards
 * every Elementor wrapper, class, inline style, script and interactive
 * widget. Components render the resulting blocks with the MDS design
 * system, so no CMS markup or styling ever reaches the page.
 *
 * Phase 6 replaces most of this with structured fields; until then it is
 * what keeps the existing ranking text on the existing URLs.
 */

/** Widgets with no editorial content, or with claims we can't verify (counters). */
const DROP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "form",
  "iframe",
  "input",
  "select",
  "textarea",
  "dotlottie-wc",
  ".elementor-widget-counter",
  ".elementor-widget-button",
  ".elementor-widget-wpr-dual-button",
  ".elementor-widget-social-icons",
  ".elementor-widget-spacer",
  ".elementor-widget-divider",
  ".elementor-widget-shortcode",
  ".elementor-widget-form",
  ".screen-reader-text",
  // Custom-HTML widgets are KEPT (two location pages hold real copy in
  // them); only document-level chrome they embed is removed.
  "head",
  "title",
  "meta",
  "link",
];

const HEADING: Record<string, 2 | 3 | 4> = {
  h1: 2,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 4,
  h6: 4,
};

export interface ParsedContent {
  blocks: ContentBlock[];
  faqs: Faq[];
}

export function htmlToBlocks(html: string | null | undefined): ParsedContent {
  if (!html || !html.trim()) return { blocks: [], faqs: [] };
  const root = parse(html, {
    comment: false,
    blockTextElements: {
      script: false,
      style: false,
      noscript: false,
      pre: true,
    },
  });
  root.querySelectorAll(DROP_SELECTORS.join(",")).forEach((el) => el.remove());

  const faqs: Faq[] = [];
  const blocks: ContentBlock[] = [];
  walk(root, blocks, faqs);
  return { blocks: tidy(blocks), faqs };
}

/* ── block walker ────────────────────────────────────────────────── */

const INLINE_TAGS = new Set([
  "a",
  "strong",
  "b",
  "em",
  "i",
  "span",
  "br",
  "small",
  "u",
  "mark",
  "code",
  "sup",
  "sub",
]);
const BLOCK_INSIDE =
  "h1,h2,h3,h4,h5,h6,p,div,article,section,ul,ol,li,img,figure,table,blockquote";

/** Text or an inline element with no block content inside it. */
function isInlineRunNode(n: Node): boolean {
  if (n.nodeType === NodeType.TEXT_NODE) return true;
  if (n.nodeType !== NodeType.ELEMENT_NODE) return false;
  const el = n as HTMLElement;
  return (
    INLINE_TAGS.has(el.rawTagName?.toLowerCase() ?? "") &&
    !el.querySelector(BLOCK_INSIDE)
  );
}

function walk(node: HTMLElement, out: ContentBlock[], faqs: Faq[]) {
  // Loose text and inline elements directly inside a block (common in
  // custom-HTML sections) form one paragraph, keeping links and emphasis.
  let run: Node[] = [];
  const flush = () => {
    if (!run.length) return;
    const content = trimInlines(mergeText(run.flatMap(inlineNode)));
    run = [];
    if (hasText(content)) out.push({ type: "paragraph", content });
  };

  for (const child of node.childNodes) {
    if (isInlineRunNode(child)) {
      run.push(child);
      continue;
    }
    flush();
    if (child.nodeType !== NodeType.ELEMENT_NODE) continue;
    const el = child as HTMLElement;
    const tag = el.rawTagName?.toLowerCase() ?? "";
    const cls = el.getAttribute("class") ?? "";

    // Elementor image-box / icon-box → feature cards; consecutive boxes form one group
    if (
      cls.includes("elementor-widget-image-box") ||
      cls.includes("elementor-widget-icon-box")
    ) {
      const card = boxToCard(el);
      if (card) {
        const prev = out[out.length - 1];
        if (prev?.type === "cards") prev.items.push(card);
        else out.push({ type: "cards", items: [card] });
      }
      continue;
    }

    // Elementor nested tabs → ordered steps (titles + panel content)
    if (
      cls.includes("elementor-widget-n-tabs") ||
      cls.includes("elementor-widget-tabs")
    ) {
      const steps = tabsToSteps(el);
      if (steps.length) out.push({ type: "steps", items: steps });
      continue;
    }
    // Accordions / toggles / <details> → FAQs
    if (
      cls.includes("elementor-widget-n-accordion") ||
      cls.includes("elementor-widget-accordion") ||
      cls.includes("elementor-widget-toggle")
    ) {
      faqs.push(...accordionToFaqs(el));
      continue;
    }

    // Standalone buttons are CTAs/UI chrome (tab titles are read above).
    if (tag === "button") continue;

    // An <a> wrapping block content (linked cards in custom-HTML sections):
    // keep the blocks and carry the link on their first heading/paragraph.
    if (
      tag === "a" &&
      el.querySelector("h1,h2,h3,h4,h5,h6,p,div,article,ul,ol,img")
    ) {
      const inner: ContentBlock[] = [];
      walk(el, inner, faqs);
      const link = resolveLink(el.getAttribute("href"));
      const target = inner.find(
        (b) => b.type === "heading" || b.type === "paragraph"
      );
      if (
        link &&
        target &&
        (target.type === "heading" || target.type === "paragraph")
      ) {
        target.content = [{ type: "link", ...link, children: target.content }];
      }
      out.push(...inner);
      continue;
    }

    if (tag in HEADING) {
      const content = inlines(el);
      if (hasText(content))
        out.push({
          type: "heading",
          level: HEADING[tag],
          content,
          ...(tag === "h1" ? { fromH1: true } : {}),
        });
      continue;
    }
    if (tag === "p") {
      const imgs = el.querySelectorAll("img");
      imgs.forEach((img) => {
        const image = toImage(img);
        if (image) out.push({ type: "image", image, caption: null });
      });
      const content = inlines(el);
      if (hasText(content)) out.push({ type: "paragraph", content });
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      const items = el
        .querySelectorAll(":scope > li")
        .map((li) => inlines(li))
        .filter(hasText);
      if (items.length)
        out.push({ type: "list", ordered: tag === "ol", items });
      continue;
    }
    if (tag === "img") {
      const image = toImage(el);
      if (image) out.push({ type: "image", image, caption: null });
      continue;
    }
    if (tag === "figure") {
      const img = el.querySelector("img");
      const image = img ? toImage(img) : null;
      const cap = el.querySelector("figcaption");
      if (image)
        out.push({ type: "image", image, caption: cap ? inlines(cap) : null });
      continue;
    }
    if (tag === "blockquote") {
      const content = inlines(el);
      if (hasText(content)) out.push({ type: "quote", content });
      continue;
    }
    if (tag === "table") {
      // Tables flatten to one paragraph per row; rare in this content.
      el.querySelectorAll("tr").forEach((tr) => {
        const text = collapse(
          tr
            .querySelectorAll("th,td")
            .map((c) => c.text)
            .join(" · ")
        );
        if (text)
          out.push({ type: "paragraph", content: [{ type: "text", text }] });
      });
      continue;
    }
    // Elementor icon lists render as <ul>, handled above. Anything else is a wrapper.
    walk(el, out, faqs);
  }
  flush();
}

/** Safe link target: internal URLs become site paths; anything else must be http(s)/mailto/tel. */
function resolveLink(
  raw: string | undefined | null
): { href: string; external: boolean } | null {
  const value = (raw ?? "").trim();
  if (!value || value.startsWith("#") || /^javascript:/i.test(value))
    return null;
  const internal = toInternalPath(value);
  const href = internal ?? value;
  if (!/^(https?:|mailto:|tel:|\/)/i.test(href)) return null;
  return { href, external: internal === null && /^https?:/i.test(href) };
}

function boxToCard(el: HTMLElement): CardItem | null {
  const titleEl =
    el.querySelector(".elementor-image-box-title, .elementor-icon-box-title") ??
    el.querySelector("h1, h2, h3, h4, h5, h6");
  const title = collapse(titleEl?.text ?? "");
  const descEl = el.querySelector(
    ".elementor-image-box-description, .elementor-icon-box-description"
  );
  const body = descEl ? inlines(descEl) : [];
  const img = el.querySelector("img");
  const image = img ? toImage(img) : null;
  if (!title && !hasText(body)) return null;
  return { title, body, image };
}

function tabsToSteps(
  el: HTMLElement
): { title: string; body: ContentBlock[] }[] {
  const titles = el
    .querySelectorAll(".e-n-tab-title, .elementor-tab-title, [role=tab]")
    .map((t) => collapse(t.text))
    .filter(Boolean);
  let panels = el.querySelectorAll(".e-n-tabs-content > *");
  if (!panels.length)
    panels = el.querySelectorAll(".elementor-tab-content, [role=tabpanel]");
  return titles.map((title, i) => {
    const body: ContentBlock[] = [];
    if (panels[i]) walk(panels[i], body, []);
    return { title, body: tidy(body) };
  });
}

function accordionToFaqs(el: HTMLElement): Faq[] {
  const details = el.querySelectorAll("details");
  if (details.length) {
    return details
      .map((d) => {
        const summary = d.querySelector("summary");
        const question = collapse(summary?.text ?? "");
        summary?.remove();
        const answer: ContentBlock[] = [];
        walk(d, answer, []);
        return { question, answer: tidy(answer) };
      })
      .filter((f) => f.question && f.answer.length);
  }
  const titles = el.querySelectorAll(
    ".elementor-tab-title, .elementor-toggle-title"
  );
  const contents = el.querySelectorAll(".elementor-tab-content");
  return titles
    .map((t, i) => {
      const answer: ContentBlock[] = [];
      if (contents[i]) walk(contents[i], answer, []);
      return { question: collapse(t.text), answer: tidy(answer) };
    })
    .filter((f) => f.question && f.answer.length);
}

/* ── inline conversion ───────────────────────────────────────────── */

function inlines(el: HTMLElement): Inline[] {
  const out: Inline[] = [];
  for (const child of el.childNodes) out.push(...inlineNode(child));
  return trimInlines(mergeText(out));
}

function inlineNode(node: Node): Inline[] {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = node.text.replace(/\s+/g, " ");
    return text ? [{ type: "text", text }] : [];
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  const tag = el.rawTagName?.toLowerCase() ?? "";
  const children = () => mergeText(el.childNodes.flatMap(inlineNode));
  switch (tag) {
    case "br":
      return [{ type: "break" }];
    case "strong":
    case "b":
      return wrap("strong", children());
    case "em":
    case "i":
      return wrap("em", children());
    case "a": {
      const kids = children();
      const link = resolveLink(el.getAttribute("href"));
      return link ? [{ type: "link", ...link, children: kids }] : kids;
    }
    case "button":
      return [];
    case "img":
      return []; // images inside inline context are lifted to image blocks by the walker
    default:
      return children();
  }
}

function wrap(type: "strong" | "em", children: Inline[]): Inline[] {
  if (!hasText(children)) return children;
  return [{ type, children }];
}

function mergeText(items: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    if (it.type === "text" && prev?.type === "text")
      prev.text = (prev.text + it.text).replace(/\s+/g, " ");
    else out.push(it.type === "text" ? { ...it } : it);
  }
  return out;
}

function trimInlines(items: Inline[]): Inline[] {
  const copy = [...items];
  while (copy[0]?.type === "break") copy.shift();
  while (copy[copy.length - 1]?.type === "break") copy.pop();
  if (copy[0]?.type === "text")
    copy[0] = { type: "text", text: copy[0].text.replace(/^\s+/, "") };
  const last = copy[copy.length - 1];
  if (last?.type === "text")
    copy[copy.length - 1] = {
      type: "text",
      text: last.text.replace(/\s+$/, ""),
    };
  return copy.filter((i) => i.type !== "text" || i.text !== "");
}

/* ── helpers ─────────────────────────────────────────────────────── */

function toImage(img: HTMLElement): ImageAsset | null {
  const src = img.getAttribute("src") ?? "";
  if (!src || src.startsWith("data:")) return null;
  // Prefer the largest srcset candidate (WordPress serves "large" as src).
  let best = src;
  let bestW = 0;
  for (const part of (img.getAttribute("srcset") ?? "").split(",")) {
    const [url, w] = part.trim().split(/\s+/);
    const width = parseInt(w ?? "", 10);
    if (url && width > bestW) {
      best = url;
      bestW = width;
    }
  }
  const w = parseInt(img.getAttribute("width") ?? "", 10);
  const h = parseInt(img.getAttribute("height") ?? "", 10);
  // Keep the declared aspect ratio, scaled to the chosen source width.
  const width = bestW || (Number.isFinite(w) ? w : null);
  const height =
    Number.isFinite(w) && Number.isFinite(h) && width
      ? Math.round((h / w) * width)
      : null;
  return {
    url: best,
    alt: collapse(img.getAttribute("alt") ?? ""),
    width,
    height,
  };
}

export function inlineText(items: Inline[]): string {
  return items
    .map((i) =>
      i.type === "text"
        ? i.text
        : i.type === "break"
          ? " "
          : "children" in i
            ? inlineText(i.children)
            : ""
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function hasText(items: Inline[]): boolean {
  return inlineText(items).length > 0;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Drop empty blocks and exact consecutive duplicates (Elementor repeats mobile/desktop copies). */
function tidy(blocks: ContentBlock[]): ContentBlock[] {
  const out: ContentBlock[] = [];
  let prevKey = "";
  for (const b of blocks) {
    const key = JSON.stringify(b);
    if (key === prevKey) continue;
    if (b.type === "paragraph" && !hasText(b.content)) continue;
    out.push(b);
    prevKey = key;
  }
  return out;
}

/** Plain text of rendered HTML (titles, excerpts). Entities decoded, tags stripped. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return collapse(parse(html).text);
}
