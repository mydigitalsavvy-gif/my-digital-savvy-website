# URL migration policy

Applies to every change made while moving mydigitalsavvy.com from WordPress/Elementor to Next.js. A change that breaks a rule needs explicit written approval and its own release.

1. **Existing indexed URLs are preserved.** Every URL that returns 200 on production keeps returning 200 at the same address (94-URL matrix: `url-migration-matrix.md`).
2. **Root-level URLs remain root-level** unless a move is explicitly approved. `/seo-agency-in-nagpur/` stays `/seo-agency-in-nagpur/`; it is never moved to `/services/seo/` as a side effect. Structured content takes over a URL through its `public_path` field, not by changing the URL.
3. **Redirects are 301.** Implemented in `frontend/proxy.ts` from one table (`frontend/config/redirects.ts`) plus content-driven redirects from the path index. No 302/307; page-level 308s exist only as a fallback for a redirect added in WordPress in the last minute.
4. **Redirects are one hop.** Slash, letter case and legacy targets are resolved together into a single 301 to the final 200. Chains and loops are collapsed or dropped by the path index.
5. **`/nargis/` is a special case.** It is a working business card from a custom WordPress template (not Elementor, not Yoast; the empty content field is expected). It is passed through to WordPress unchanged — page, photo and contact card — and is never migrated, rebuilt, redirected, deleted, re-titled or removed from the sitemap. **At cutover, any rule that redirects the old WordPress frontend must exclude `/nargis/` and `/nargis/*`.** Its final purpose is a separate business decision (`CONTENT_REVIEW_REQUIRED`).
6. **`/thank-you/` remains noindex** (Yoast setting), self-canonical and out of the sitemap.
7. **Elementor template URLs are excluded** from the sitemap (`/?wpr_templates=…`: `EXCLUDE_FROM_SITEMAP`; it keeps WordPress's 301 to `/`).
8. **SEO metadata is preserved from Yoast**: title, description, canonical, robots, Open Graph and Twitter values come from Yoast and are not rewritten in Next.js. Missing Yoast values stay missing.
9. **Content migration does not imply URL migration.** Moving a page from Elementor into structured fields changes how it is stored, not where it lives or what it is called.
10. **Platform migration and SEO strategy changes stay separate.** Consolidations, retitling, new URL structures and redirects for "cleaner" URLs (including the Nagpur-page decision) happen in their own releases after the cutover has stabilised, each with its own before/after measurement.

### Also in force
- Redirects are only added to preserve behaviour that exists on production today (e.g. WordPress slug-guess links that land on the right page). URLs that never returned 200 get **no** redirect.
- Feeds: the site feed and category feeds remain; comment, per-post, tag and author feeds 301 to `/feed/`.
- Yoast sitemap URLs 301 to `/sitemap.xml`; resubmit the new sitemap in Search Console at cutover.
- Media URLs (`/wp-content/uploads/*`) keep working through `WORDPRESS_MEDIA_ORIGIN` at cutover; moving media is a separate change.
