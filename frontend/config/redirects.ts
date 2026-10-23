/**
 * Every static legacy redirect, in one place. Applied by proxy.ts as a
 * single 301 straight to the final URL (no chains). Content-driven
 * redirects (previous paths, the front-page slug, /services/<slug>/ for
 * services living at the root) come from the path index via
 * /api/redirect-map/ and are applied the same way.
 *
 * Policy (docs/phase-7/migration-policy.md): only redirects that preserve
 * an existing URL's behaviour belong here. No "cleanup" redirects.
 */

/** Exact path → final path. Keys and values are lowercase with trailing slash (files excepted). */
export const STATIC_REDIRECTS: Record<string, string> = {
  // Yoast sitemap URLs (submitted in Search Console) → the Next.js sitemap.
  "/sitemap_index.xml": "/sitemap.xml",
  "/post-sitemap.xml": "/sitemap.xml",
  "/page-sitemap.xml": "/sitemap.xml",
  "/category-sitemap.xml": "/sitemap.xml",
  "/post_tag-sitemap.xml": "/sitemap.xml",
  "/author-sitemap.xml": "/sitemap.xml",
  "/wpr_templates-sitemap.xml": "/sitemap.xml",

  // Comment feed → site feed.
  "/comments/feed/": "/feed/",

  // Links in existing page content (Indore page) that WordPress resolves by
  // slug-guessing to the right page. /services/seo is NOT here: WordPress
  // sends it to an image, which is a bug, not behaviour to preserve.
  "/services/social-media-marketing/":
    "/social-media-marketing-company-in-nagpur/",
  "/services/video-editing/": "/video-editing-company-in-nagpur/",
  "/services/website-development/": "/website-development-company-in-nagpur/",
};

/** Pattern redirects, evaluated in order after the exact table. */
export const PATTERN_REDIRECTS: {
  pattern: RegExp;
  to: (m: RegExpMatchArray) => string;
  note: string;
}[] = [
  {
    pattern: /^\/tag\/[^/]+\/feed\/$/,
    to: () => "/feed/",
    note: "tag feed → site feed",
  },
  {
    pattern: /^\/author\/[^/]+\/feed\/$/,
    to: () => "/feed/",
    note: "author feed → site feed",
  },
  // Per-post / per-page feeds. /feed/ itself and /category/<x>/feed/ are real routes.
  {
    pattern: /^\/(?!category\/)[^/]+\/feed\/$/,
    to: () => "/feed/",
    note: "per-post feed → site feed",
  },
  // WordPress sends page 1 of any archive to the archive itself.
  {
    pattern: /^(\/.+\/)page\/1\/$/,
    to: (m) => m[1],
    note: "archive page 1 → archive",
  },
];

export function staticRedirectFor(path: string): string | null {
  if (STATIC_REDIRECTS[path]) return STATIC_REDIRECTS[path];
  for (const r of PATTERN_REDIRECTS) {
    const m = path.match(r.pattern);
    if (m) return r.to(m);
  }
  return null;
}
