import "server-only";
import type { PostSummary } from "@/types/content";
import { absoluteUrl, SITE_URL } from "@/lib/site";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** RSS 2.0, the same format WordPress's /feed/ served. */
export function rssResponse(opts: {
  title: string;
  selfPath: string;
  description: string;
  posts: PostSummary[];
}) {
  const items = opts.posts
    .slice(0, 20)
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(absoluteUrl(p.path))}</link>
      <guid isPermaLink="true">${esc(absoluteUrl(p.path))}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
${p.categories.map((c) => `      <category>${esc(c.name)}</category>`).join("\n")}
      <description>${esc(p.excerpt)}</description>
    </item>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(opts.title)}</title>
    <link>${esc(SITE_URL)}/</link>
    <atom:link href="${esc(absoluteUrl(opts.selfPath))}" rel="self" type="application/rss+xml" />
    <description>${esc(opts.description)}</description>
    <language>en-US</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=UTF-8" },
  });
}
