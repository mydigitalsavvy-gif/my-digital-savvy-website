# Phase 6 — WordPress CMS activation and structured content migration

**Status: BLOCKED at the production safety gates (6A backup, 6B identity). No WordPress site was modified.** Everything that can be done without touching WordPress is done and verified against a simulated import; the WordPress steps are prepared as exact, guarded, reversible operations awaiting approval.

## 6A — Backup: FAIL (cannot be confirmed)

No authenticated access to the production WordPress (mydigitalsavvy.com) exists in this environment, so a files + database backup, its timestamp, location and restore method cannot be confirmed. Per the phase rules, no change was attempted.

What is needed: a full Hostinger backup (files + database) taken immediately before step 1 below, with its timestamp recorded here, plus a test restore of the database to a staging site. The All-in-One WP Migration plugin already installed on production can also export a full archive.

## 6B — WordPress identity: production NOT reachable; connected site is NOT production

| | Production (read-only public checks) | WordPress connector available in this session |
|---|---|---|
| URL | https://mydigitalsavvy.com | https://white-sparrow-977728.hostingersite.com |
| Admin email | not visible | codewithadr@gmail.com |
| Theme | (Elementor pages) | Astra 4.14.0 |
| Yoast SEO | active (28.5) | **absent** |
| Wordfence, PixelYourSite, Forminator | active | **absent** |
| Elementor | active | active (4.3.2) |
| Secure Custom Fields | absent | absent |
| Other | — | Novamira ("for development and staging only"), one Administrator |

The connected site is a separate Hostinger test install. It was **not** modified (only `site-info-get`, a read, was called). Using it as a rehearsal environment needs the owner's confirmation of what it is.

## Changes made

### WordPress changes made
None.

### Next.js changes made
- **Nargis — `CONTENT_REVIEW_REQUIRED`.** The live `/nargis/` page is a working digital business card produced by a custom template outside Elementor and Yoast (the WordPress content field is empty). It is now registered in `frontend/config/content-review.ts` and **passed through to WordPress unchanged** (`next.config.ts` rewrite, including its own assets `/nargis/photo.png` and `/nargis/nargis.vcf`). Result: byte-identical HTML, same title/description/OG tags, same URL, kept in the sitemap, not rebuilt, redirected or deleted. *Cutover note:* when WordPress moves to the CMS host and its frontend is redirected, `/nargis/` must be excluded from that redirect until a decision is made.
- **Parser (`lib/wordpress/html-blocks.ts`) — no content silently lost.** Custom-HTML widgets are kept (two location pages hold real copy in them; previously dropped), Elementor image-box / icon-box widgets become typed feature cards, loose inline text and links in custom HTML are kept as paragraphs, and links that wrap whole cards are kept on the card heading. Document chrome inside widgets (`head`, `title`, `meta`) is removed.
- **Feature cards / benefits.** New `cards` block (rendered with the existing card vocabulary, `cx-cards`); on service pages the first card group is the benefits list (with its icon image).
- **Canonical safety net.** Structured post types that take over a legacy URL always canonicalise to that public URL (`lib/content/entries.tsx`); the content model also makes WordPress's permalink equal `public_path`.
- **Preserved slug-guess redirects.** Three `/services/*` links in existing content resolved on WordPress by slug guessing to the right page; they are now explicit 301s. The one that WordPress sends to an image (`/services/seo`) is not copied.
- **Exact 301s** for all `next.config.ts` redirects (was 308). Page-level redirects remain 308 (Next.js behaviour; Google treats both as permanent).
- **No prefetch on CMS content links**, so broken legacy links don't trigger background 404s.
- **Migration tooling:** `pnpm migrate:build` (payloads) and `pnpm migrate:import` (guarded importer, dry-run by default). Pure helpers moved out of server-only modules so both the site and the scripts use the same parser (`lib/wordpress/hero.ts`, `lib/content/html-serialize.ts`).

### WordPress code updated (not installed)
- `wordpress/mu-plugins/mds-content-model.php`: benefits rows gain an image; `post_type_link` uses `public_path`; Yoast meta keys and `mds_source_page_id` are writable over REST by users who can edit the post (for the importer).

## Content migrated

**Prepared, not imported.** `wordpress/migration/batch-1/` holds 13 draft payloads (9 service pages, 4 location pages) plus `manifest.json`. Each contains the structured fields, the exact Yoast values, the source page ID and a review list. Fields with no source content are left empty and listed (`review.editorial_gaps`); nothing is invented. Site settings, testimonials, portfolio and case studies: **no source content exists in WordPress** (no such pages or fields), so there is nothing to migrate yet.

Content parity (`content-parity.md`): **13/13 pages keep 100% of their text, all images, all internal links, the live H1 and identical title / description / canonical / robots / Open Graph** when the structured content is rendered by Next.js.

## URLs tested

94-URL inventory against live WordPress data: **85 identical** (now including `/nargis/`), 7 intentional redirects (secondary feeds, old sitemap URLs), the leaked template URL (same target), and `/thank-you/` (Yoast noindex kept). Every redirect is a **single hop to a 200**; no chains, loops or unexpected 404/500.

## SEO comparison
Homepage and all legacy pages: title, description, canonical, robots and Open Graph match production (see `../phase-5/url-inventory.md` and `content-parity.md`). `/thank-you/`: `noindex, follow`, self canonical, excluded from the sitemap — unchanged Yoast behaviour. No aggregate rating anywhere.

## Preview test (simulated WordPress, real Next.js)
1–2 Preview → `/api/draft/` → Draft Mode → public URL ✓ · 3 preview shows the unsaved autosave title ✓ (marked, noindex) · 4 public page keeps the published title ✓ · 8 exit clears the cookie ✓ · 9 no credential or secret in HTML or browser bundles ✓. Real-WordPress preview is pending items B–D below.

## Revalidation test
Valid secret → 200 with the right tags per type (e.g. a service save invalidates `service`, `service:<slug>`, `service:<id>`, its SEO path, previous paths, `paths`, `home`) · invalid / missing secret → 401 · unknown type → 400 · malformed JSON → 400 · end-to-end: a published change stays cached until the webhook fires, then appears on the next request ✓.

## Build status
`npm run build`, `lint`, `typecheck`, `format:check`: pass. Homepage pixel parity unchanged (static fallback and live WordPress data, 6 viewports). Content pages at 6 viewports: no overflow, no broken images, no console errors (except the browser's `/favicon.ico` probe on the passthrough Nargis page, which production returns 404 for too).

## 6G — wp-config settings (read from `mds-headless.php`)

| Name | Purpose | Used in | Required | Safe to expose? |
|---|---|---|---|---|
| `MDS_FRONTEND_URL` | Next.js origin for revalidation calls and preview links | revalidation `shutdown` hook, `preview_post_link` filter | Yes, for either feature | Yes (public URL) |
| `MDS_REVALIDATE_SECRET` | Shared secret sent as `x-mds-secret` to `/api/revalidate/`; must equal the Next.js env var of the same name | revalidation hooks | Yes, to enable revalidation | **No** — server-side only |
| `MDS_PREVIEW_SECRET` | Shared secret in the Preview link to `/api/draft/`; must equal the Next.js env var | `preview_post_link` filter | No — **leave undefined** until Next.js serves the public site, so Preview keeps opening WordPress | **No** — visible only to logged-in editors in wp-admin |

Next.js (server-side only, never `NEXT_PUBLIC_*`): `WORDPRESS_API_URL`, `WORDPRESS_PREVIEW_USER`, `WORDPRESS_PREVIEW_APP_PASSWORD`, `MDS_REVALIDATE_SECRET`, `MDS_PREVIEW_SECRET`. Importer (one-off, local shell only): `WP_IMPORT_API_URL`, `WP_IMPORT_USER`, `WP_IMPORT_APP_PASSWORD`.

## Remaining risks
- Production backup and identity unverified — the gate for everything below.
- Structured pages supersede the Elementor pages in Next.js only when **published**; until then Next.js keeps rendering the legacy pages (verified safe).
- 7 broken links inside existing page content (corrected count; see `../phase-7/broken-links.md`) — editorial fixes.
- 4 Nagpur location pages still compete for one keyword (Phase 7 decision).
- Next.js data cache persists across builds; content changes reach a running site only through revalidation or the 24 h window (by design).

## Items requiring explicit approval (in order; each is reversible)

| # | Change | Where | Rollback |
|---|---|---|---|
| A | Confirm production access + take/verify a full backup; decide whether the white-sparrow test site may be used as staging | Hostinger | — |
| B | Install **Secure Custom Fields** (free) | production wp-admin → Plugins | Deactivate |
| C | Upload `mds-content-model.php` to `wp-content/mu-plugins/` → verify REST (`/wp-json/wp/v2/services` returns `[]`, `/wp-json/wp/v2/types` lists the six types, Yoast still in page responses) | production files | Delete the file |
| D | Create the Editor user `nextjs-preview` + Application Password; put credentials in the Next.js server env | wp-admin → Users | Revoke the password |
| E | Upload `mds-headless.php`; add `MDS_FRONTEND_URL` + `MDS_REVALIDATE_SECRET` to wp-config (**not** `MDS_PREVIEW_SECRET`) → verify `/wp-json/mds/v1/paths` | production files | Delete the file / remove constants |
| F | `pnpm migrate:import --apply --expect-site https://mydigitalsavvy.com --only seo-agency-in-nagpur` (one page first), review the draft in wp-admin, then the rest of batch 1 | local shell | Trash the drafts |
| G | Editorial review of each draft, then publish one at a time (the Elementor page stays published and keeps serving the live site) | wp-admin | Unpublish |
| H | After cutover only: set `MDS_PREVIEW_SECRET` to switch the Preview button to Next.js | wp-config | Remove the constant |
