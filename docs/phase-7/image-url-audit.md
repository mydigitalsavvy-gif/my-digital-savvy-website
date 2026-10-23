# Image URL audit

295 distinct image URLs referenced by the live pages and by the Next.js pages (img/srcset incl. next/image sources, og:image). Every one was requested (HEAD): **all return 200**.

| Host | URLs | Used by Next.js | Status | Current usage | Next.js usage | Impact when WordPress moves to the CMS host | Rewrite / proxy needed |
|---|---:|---:|---|---|---|---|---|
| mydigitalsavvy.com | 272 | 197 | 200 | WordPress media library (/wp-content/uploads/…) in page/post content, featured images, Yoast og:image | next/image via remotePatterns (optimised, AVIF/WebP); og:image passed through | After DNS points to Vercel, /wp-content/uploads/* on the main domain no longer reaches WordPress. Content and Yoast still reference these URLs. | **Yes** — set `WORDPRESS_MEDIA_ORIGIN` (already implemented: afterFiles rewrite to the CMS origin). Add the CMS host to remotePatterns automatically via `WORDPRESS_API_URL`. |
| nargis.mydigitalsavvy.com | 1 | 1 | 200 | og:image of /nargis/ (separate subdomain) | Untouched (passthrough HTML) | None — separate subdomain, not part of this migration | No |
| secure.gravatar.com | 1 | 1 | 200 | Author avatar (Yoast/author schema) | Not rendered by Next.js components | None | No |
| www.facebook.com | 1 | 0 | 200 | Meta Pixel noscript tracking image on live pages | Not used (tracking is Phase 9) | None | No |
| lh3.googleusercontent.com | 20 | 0 | 200 | Google review avatars on the live Elementor homepage widget | Not used (Next.js homepage uses no review widget) | None | No |

**Nargis assets**: `/nargis/photo.png` (200, image/png) and `/nargis/nargis.vcf` (200, text/vcard) are relative to the page and are served through the same passthrough rewrite as the page.

**Media is not moved in this phase.** At cutover, either keep WordPress media on the CMS host and rely on the `/wp-content/uploads/*` rewrite (no content changes, no broken image URLs), or run a later, separate media-domain change with its own redirect plan.
