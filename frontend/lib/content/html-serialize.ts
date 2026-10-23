import type { ContentBlock, Inline } from "@/types/content";

/**
 * Typed blocks → clean, minimal HTML for WordPress rich-text fields
 * (used by the migration scripts, never rendered by the site).
 *
 * Output uses only h2–h4, p, ul/ol/li, strong, em, a, br, figure/img,
 * figcaption and blockquote. Every text node and attribute is escaped, so
 * no Elementor markup, class, style or script can survive the round trip.
 */

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function inlinesToHtml(items: Inline[]): string {
  return items
    .map((i) => {
      switch (i.type) {
        case "text":
          return esc(i.text);
        case "break":
          return "<br>";
        case "strong":
          return `<strong>${inlinesToHtml(i.children)}</strong>`;
        case "em":
          return `<em>${inlinesToHtml(i.children)}</em>`;
        case "link":
          return `<a href="${esc(i.href)}">${inlinesToHtml(i.children)}</a>`;
      }
    })
    .join("");
}

export function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `<h${b.level}>${inlinesToHtml(b.content)}</h${b.level}>`;
        case "paragraph":
          return `<p>${inlinesToHtml(b.content)}</p>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          return `<${tag}>${b.items.map((li) => `<li>${inlinesToHtml(li)}</li>`).join("")}</${tag}>`;
        }
        case "image": {
          const dims =
            (b.image.width ? ` width="${b.image.width}"` : "") +
            (b.image.height ? ` height="${b.image.height}"` : "");
          const cap = b.caption
            ? `<figcaption>${inlinesToHtml(b.caption)}</figcaption>`
            : "";
          return `<figure><img src="${esc(b.image.url)}" alt="${esc(b.image.alt)}"${dims}>${cap}</figure>`;
        }
        case "quote":
          return `<blockquote>${inlinesToHtml(b.content)}</blockquote>`;
        case "steps":
          // Steps live in their own repeater field; flattened here only as a fallback.
          return b.items
            .map((s) => `<h3>${esc(s.title)}</h3>${blocksToHtml(s.body)}`)
            .join("");
        case "cards":
          // Cards on service pages go to the benefits repeater; elsewhere they flatten.
          return b.items
            .map(
              (c) =>
                (c.title ? `<h3>${esc(c.title)}</h3>` : "") +
                (c.body.length ? `<p>${inlinesToHtml(c.body)}</p>` : "")
            )
            .join("");
      }
    })
    .join("\n");
}
