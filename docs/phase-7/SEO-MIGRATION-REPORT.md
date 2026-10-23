# SEO migration report — mydigitalsavvy.com (WordPress → Next.js)

Phase 7 · read-only against production WordPress · no WordPress, DNS or content changes made.

# Executive Summary

The Next.js site, running on live WordPress data, preserves every indexed URL and its Yoast metadata.

- **94/94 URLs reconciled:** 74 KEEP, 13 single-hop 301, 4 CONTENT_REVIEW (Nagpur pages, served unchanged), 1 SPECIAL_CASE (`/nargis/`), 2 DO_NOT_MIGRATE (404 on production too).
- **Redirects:** all 13 are one **301** straight to a **200**. No 302/307/308 on the first hop, no chains, no loops. The 7 intentional redirects are individually verified.
- **Metadata:** 656 of 693 field checks match production exactly; 36 are documented special cases; **1 mismatch** — the homepage H1 (frozen design).
- **Sitemap:** every production sitemap URL is present except the leaked Elementor template; all 75 entries return 200, self-canonical, indexable.
- **Structured data:** valid on all 76 pages that carry it; no ratings or reviews; no FAQ markup (no page has FAQs).
- **Content:** the 13 migrated pages keep 100% of their text, images, links, H1 and metadata after a simulated import (`../phase-6/content-parity.md`).
- **Open items:** 1 CRITICAL operational blocker (production access/backup), 4 HIGH, 4 MEDIUM, 5 LOW (`launch-blockers.md`). Six decisions need a human (last section).

Changes made in this phase (Next.js only): all redirects moved into `frontend/proxy.ts` + `frontend/config/redirects.ts` so slash, case and legacy redirects are a **single 301** (previously some were 308 or two hops); Twitter tags now follow Yoast (label/data pairs reproduced).

# URL Inventory

Full matrix: `url-migration-matrix.md`. Sources: all production Yoast sitemaps (73 URLs) plus 21 real WordPress URLs outside them (pagination, feeds, shortlinks, front-page slug, case/slash variants, controls).

| Action | URLs |
|---|---:|
| KEEP | 74 |
| 301 | 13 |
| CONTENT_REVIEW | 4 |
| SPECIAL_CASE | 1 |
| DO_NOT_MIGRATE | 2 |

# Redirect Matrix

| Old URL | → Final | Why | Same as production? |
|---|---|---|---|
| `/comments/feed/` | `/feed/` | intentional: comment feed → site feed | No (prod 200) — intentional |
| `/ai/feed/` (any per-post feed) | `/feed/` | intentional | No — intentional |
| `/tag/<slug>/feed/` | `/feed/` | intentional | No — intentional |
| `/author/<slug>/feed/` | `/feed/` | intentional | No — intentional |
| `/sitemap_index.xml` | `/sitemap.xml` | intentional | No — intentional |
| `/post-sitemap.xml` (and page/category/post_tag/author/wpr_templates) | `/sitemap.xml` | intentional | No — intentional |
| `/digital-marketing-agency-in-nagpur/` | `/` | front-page slug | Yes |
| `/?p=9616`, `/?page_id=7505` | permalink | shortlinks | Yes |
| `/?wpr_templates=user-popup-pop-up` | `/` | leaked template | Yes |
| `/seo-agency-in-nagpur` (no slash) | `/seo-agency-in-nagpur/` | trailing slash | Yes |
| `/SEO-Agency-In-Nagpur/` | `/seo-agency-in-nagpur/` | letter case | Production serves a duplicate 200 with the same canonical |
| `/services/social-media-marketing`, `/video-editing`, `/website-development` | the matching service page | WordPress slug-guess links in content | Yes |
| `/services/<slug>/` for a root-level service | its root URL | structured alias | Yes (slug-guess) |
| previous paths from WordPress | current URL | content model `previous_paths` | n/a (verified on simulated content) |

Verification: every row is `301 → 200` in one hop (`legacy-url-audit.md`).

# Canonical Audit

Every Next.js page that returns 200 canonicalises to itself (absolute `https://mydigitalsavvy.com/…/`), matching Yoast — except two documented cases: `/nargis/` (no canonical, identical to production) and `/thank-you/` (production prints none; Next.js applies Yoast's self canonical). Structured post types that take over a root URL are forced to self-canonical (`lib/content/entries.tsx`) and WordPress's permalink is set to `public_path` (`mds-content-model.php`), so `/seo-agency-in-nagpur/` can never canonicalise to `/services/…`.

# Yoast Metadata Audit

Details: `metadata-parity.md`. Title, description, canonical, robots, OG title, OG description, OG image and Twitter card: **MATCH** on every page except documented special cases. Homepage H1 is the single MISMATCH. Next.js auto-fills `twitter:title/description/image` from Open Graph with identical values (no opt-out; equivalent to Yoast's fallback).

# Sitemap Audit

| Check | Result |
|---|---|
| Production URLs present | 72/73 — the missing one is `/?wpr_templates=user-popup-pop-up` → **EXCLUDE_FROM_SITEMAP** |
| Added | `/services/`, `/about/`, `/contact/` (new routes — see Human Decisions) |
| Entries returning 200 | 75/75 |
| Noindex entries | 0 |
| Redirected entries | 0 |
| Non-self canonical | 0 (`/nargis/` has no canonical, as on production) |
| `/thank-you/` | excluded |
| `/nargis/` | included |
| Old Yoast sitemap URLs | 301 → `/sitemap.xml` |

# Structured Data Audit

| Page type | Types | Pages |
|---|---|---:|
| Homepage | Organization + LocalBusiness | 1 |
| Service pages | Organization + BreadcrumbList + Service | 9 |
| Blog posts | Organization + BreadcrumbList + Article | 21 |
| Other pages, archives | Organization + BreadcrumbList | 45 |

Checks on all 76: valid JSON; `@context` present; every URL absolute on the production domain; Article/Service `url` = canonical; breadcrumb positions sequential, last item = canonical, every breadcrumb target returns 200; Article has headline and valid datePublished; LocalBusiness has address and telephone; **no aggregateRating, review or reviewRating anywhere**; no FAQPage (no page shows FAQs — added only when real FAQs exist); no fabricated metrics (case-study metrics without a source are dropped by the adapter).

# Nargis Special Case

`/nargis/` is a working business card rendered by a custom WordPress template outside Elementor and Yoast; its empty content field is expected. Status: **SPECIAL_CASE / CONTENT_REVIEW_REQUIRED**.

| Check | Result |
|---|---|
| HTTP | 200 (no redirect; `/nargis` without slash 301s to `/nargis/`, as on production) |
| HTML | byte-identical to production (passthrough) |
| Title | "Nargis Sheikh — Digital Marketing & Web Development" (unchanged) |
| Description, OG tags (`og:type` profile, `og:image` on nargis.mydigitalsavvy.com) | identical |
| Photo `/nargis/photo.png` | 200 image/png |
| Contact card `/nargis/nargis.vcf` | 200 text/vcard |
| Sitemap | present |
| Favicon request | 404, same as production (not a blocker) |

**Cutover rule:** exclude `/nargis/` and `/nargis/*` from any redirect of the old WordPress frontend.

# Thank-you Page

`/thank-you/`: 200, **noindex, follow**, self canonical, **not in the sitemap**. Unchanged Yoast intent; not made indexable.

# Nagpur Page Overlap

`nagpur-page-overlap.md`. Measured: the four pages share ≤9% of their text; they are an About page, a Contact page (11 inbound links), a services overview and an orphaned informational post — all titled for the same head term. Classified OVERLAPPING_INTENT ×2, CONTENT_REVIEW_REQUIRED ×1, POTENTIAL_CONSOLIDATION ×1. **No change made.**

# Broken Internal Links

`broken-links.md` and `internal-link-audit.md`. 54 content links on the 13 migrated pages: 44 valid, 3 slug-guess links kept working with explicit 301s, **7 broken** (all broken on production too): 5 FIX_BEFORE_LAUNCH (unambiguous), 2 HUMAN_REVIEW. None changed.

# Image URL Audit

`image-url-audit.md`. 295 image URLs, all 200. Next.js uses media from `mydigitalsavvy.com/wp-content/uploads` (via next/image) — at cutover these need the `WORDPRESS_MEDIA_ORIGIN` rewrite (implemented). Nargis assets travel with the passthrough. Third-party images (Google review avatars, Gravatar, Meta pixel) are unaffected.

# Legacy URL Audit

`legacy-url-audit.md`. 44 patterns + 5 previous-path cases: trailing-slash variants, capitalised paths, `?p=` / `?page_id=`, category/tag/author archives and pagination, RSS, comment/per-post/tag/author feeds, all 7 Yoast sitemaps, front-page slug, slug-guess links, structured aliases, previous service/location paths. All resolve to 200, a single 301→200, or a 404 that production also returns. One documented exception: `/services/seo` (production sends it to an image; not reproduced).

# Launch Blockers

`launch-blockers.md`. CRITICAL: production WordPress access + backup. HIGH: homepage H1; 7 broken content links; media origin and Nargis exclusion at cutover. No CRITICAL SEO defects in Next.js.

# Human Decisions Required

Only items that cannot safely be automated:

1. **Four competing Nagpur pages** — distinct targets, retitling, or consolidation (`nagpur-page-overlap.md`), decided with Search Console data and executed after cutover.
2. **Two ambiguous broken links** — where "Social Media Management" and "YouTube Management" on the Indore page should point. Also approve the five unambiguous fixes before they are made in WordPress.
3. **Whether any content should be consolidated** — including the blog post `/digital-marketing-services-in-nagpur/` vs the services page, and the new `/about/`, `/contact/`, `/services/` routes vs the existing About, Contact and services pages (keep and de-index, keep both, or consolidate later).
4. **Final treatment of CONTENT_REVIEW pages** — `/nargis/` (keep as-is on the agency domain, move to nargis.mydigitalsavvy.com, or other) and the four Nagpur pages.
5. **Homepage H1** — the frozen design replaces "Best Digital Marketing Agency in Nagpur" in the H1. Options: accept; add the keyword to the H1 within the design; or an invisible implementation change that keeps the visual identical while removing the duplicated rotor word from the DOM text (requires lifting the homepage freeze for that one element).
6. **Production access, backup and staging** — prerequisite for every WordPress-side step.

# Production Migration Checklist

**Before cutover**
- [ ] Production access confirmed; full files + database backup taken and test-restored
- [ ] Phase 6 WordPress steps approved and done (SCF, content model, preview user, bridge plugin without preview secret)
- [ ] Human decisions 1–5 recorded; approved link fixes made in WordPress
- [ ] Search Console export of clicks/impressions per URL (baseline)
- [ ] Staging: 94-URL matrix, legacy audit, metadata parity, content parity, sitemap and structured-data checks re-run against staging and production
- [ ] Next.js env set: `WORDPRESS_API_URL` (CMS host), `NEXT_PUBLIC_SITE_URL`, `MDS_REVALIDATE_SECRET`, preview credentials (server-only)

**Cutover**
- [ ] WordPress moved to the CMS host; its frontend redirects to the main domain **except `/nargis/` and `/nargis/*`**
- [ ] `WORDPRESS_MEDIA_ORIGIN` set; spot-check `/wp-content/uploads/*` images
- [ ] DNS to Vercel; TLS valid; `www` → apex as today
- [ ] Re-run the 94-URL check against the live domain: every URL 200 or single 301→200
- [ ] Submit `/sitemap.xml` in Search Console; keep the old Yoast sitemap URLs redirecting
- [ ] Verify revalidation from a real WordPress save; verify preview (then set `MDS_PREVIEW_SECRET`)

**After cutover (2–6 weeks)**
- [ ] Daily: Search Console coverage, 404s, redirect errors; server logs for 404/5xx
- [ ] Weekly: rankings and clicks for the baseline queries vs pre-cutover
- [ ] Only then: SEO strategy changes (Nagpur pages, consolidations) as separate releases
