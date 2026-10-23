# Phase 5 — WordPress integration and legacy URL preservation

Status: **Next.js side complete. No WordPress changes made.** Three WordPress-side changes are prepared and waiting for approval (see the last section).

## 1. WordPress REST audit (read-only, live site)

| Item | Finding |
|---|---|
| Install | WordPress with Yoast SEO 28.5, Elementor, Wordfence, LiteSpeed Cache, PixelYourSite, Forminator, Site Kit |
| Content | 17 pages, 21 posts, 11 categories, 57 tags (25 with posts), 373 media items |
| Post types | Only `post` and `page` (plus Elementor internals). **No** service, case study, testimonial, portfolio or industry types. |
| Custom fields | No ACF/SCF installed; no structured fields exist |
| Content format | Pages **and** posts are Elementor widget markup |
| Yoast | `yoast_head_json` on every page, post and term; `yoast/v1/get_head` works for non-object URLs (author archive) but not for paginated archives |
| URLs | Pages and posts both live at the root (`/seo-agency-in-nagpur/`, `/google-ads-vs-meta-ads/`); trailing slashes; slug matching is case-insensitive; the front page's own slug 301s to `/`; `?p=ID` shortlinks 301 |
| Archives | Blog index `/my-digital-savvy-blog/` (10 posts per page, pages 2–3 exist), `/category/*/`, `/tag/*/`, `/author/mydigitalsavvy/` |
| Feeds | `/feed/`, `/comments/feed/`, `/category/*/feed/`, `/<post>/feed/`, tag and author feeds |
| Sitemaps | Yoast `/sitemap_index.xml` (+ post, page, category, post_tag, author, wpr_templates) |
| REST users endpoint | Locked (returns nothing anonymously) — author archive is confirmed via Yoast instead |
| Hosting behaviour | Bursts of parallel requests get transient 500s/timeouts; the client now limits concurrency and retries |

## 2. What the Next.js side now does

- **Path index** (`lib/wordpress/path-index.ts`): resolves every public URL to its content. Uses the `mds/v1/paths` endpoint once the bridge plugin is installed; until then builds the same index from the public REST API. Handles previous-path 301s (loop- and chain-safe), case variants and the front-page slug.
- **Root-level route** (`app/[slug]`): renders service, location, post, page and blog-index URLs at their existing addresses. `/services/[slug]`, `/case-studies/[slug]`, `/industries/[slug]` are ready for the structured types and 301 to a root URL when the item lives there.
- **No Elementor HTML is rendered.** `lib/wordpress/html-blocks.ts` turns it into typed blocks (headings, paragraphs, lists, images, tab steps, FAQs) and drops buttons, counters, scripts and layout wrappers. The live page H1 is kept as the hero H1 on all 13 service/location pages.
- **Yoast metadata** on every route (`lib/seo/metadata.ts`), including the homepage. Missing Yoast descriptions stay missing rather than being invented.
- **Structured data**: Organization (every page), LocalBusiness (home, contact), Service + FAQPage (services with FAQs), Article (posts, case studies), BreadcrumbList (all non-home pages). No rating markup anywhere.
- **Caching**: tagged fetches (services/locations/industries/case studies/testimonials/paths/settings 24 h; posts/taxonomies 1 h) and `POST /api/revalidate/` with a shared secret.
- **Preview**: `/api/draft/` → Draft Mode → public URL (or `/preview/<type>/<id>/` for unpublished content), uncached authenticated reads with the latest autosave.
- **Homepage**: `getHomePage()` overlays WordPress slices (settings, testimonials, service ledes, blog link) on the static content; falls back to static content per slice.

## 3. Verification

| Check | Result |
|---|---|
| URL inventory (94 URLs) | 84 identical; 7 intentional redirects (secondary feeds and old sitemap URLs); 3 explained — see `url-inventory.md` |
| Sitemap | Every live Yoast sitemap URL present except the leaked Elementor template URL |
| H1 continuity | 13/13 legacy service and location pages keep the live H1 |
| Homepage parity | Unchanged in static, live-WordPress and mock-WordPress modes at 6 viewports |
| Mock structured content | Service CPT at an existing URL, previous-path 301, FAQ schema, unsourced metric hidden, settings/testimonials on homepage |
| Endpoints | Revalidate: 401 without/with wrong secret, 400 bad type, 200 valid, 405 GET. Draft: 401/400/503 as designed |
| Build, typecheck, lint, format | Pass |

### Known differences (decide or accept)

1. **`/nargis/`** — *Corrected in Phase 6:* the live page is not empty; it is a working business card rendered by a custom template outside Elementor and Yoast. It is now marked `CONTENT_REVIEW_REQUIRED` and passed through to WordPress unchanged (see `../phase-6/README.md`).
2. **`/thank-you/`** — the live page emits no Yoast tags; Next.js applies Yoast's own *noindex*, which is the intended setting.
3. **Feeds** — comment, per-post, tag and author feeds now 301 to `/feed/`.
4. **Redirect status** — page-level permanent redirects are 308 (Google treats as 301). On a cold cache miss Next.js repeats the identical `Location` header once.

## 4. WordPress changes awaiting approval

Nothing below has been done. Each item is independent.

### A. Bridge plugin — `wordpress/mu-plugins/mds-headless.php`
Adds read-only endpoints `mds/v1/paths` and `mds/v1/settings`, sends a non-blocking revalidation request on save, and points the Preview button at Next.js. Inert until constants are set.
1. Upload to `wp-content/mu-plugins/` (create the folder if missing).
2. Add to `wp-config.php` above "That's all, stop editing":
   ```php
   define( 'MDS_FRONTEND_URL', 'https://<next.js host>' );
   define( 'MDS_REVALIDATE_SECRET', '<random 40+ chars>' );
   define( 'MDS_PREVIEW_SECRET', '<different random 40+ chars>' );
   ```
3. Set the same secrets in the Next.js environment (`MDS_REVALIDATE_SECRET`, `MDS_PREVIEW_SECRET`).
4. Check: `GET /wp-json/mds/v1/paths` returns JSON.

**Note:** while WordPress still serves the public site, leave `MDS_PREVIEW_SECRET` unset so the Preview button keeps opening WordPress previews.

### B. Preview credentials
1. Create a WordPress user with the **Editor** role (e.g. `nextjs-preview`).
2. Users → that user → Application Passwords → add "Next.js preview".
3. Put the user name and password in the Next.js environment as `WORDPRESS_PREVIEW_USER` and `WORDPRESS_PREVIEW_APP_PASSWORD` (server-only).

### C. Content model — `wordpress/mu-plugins/mds-content-model.php` (Phase 6)
Requires Secure Custom Fields (free) or ACF Pro. Registers empty post types (`service`, `location_page`, `case_study`, `industry`, `portfolio_project`, `testimonial`) with the REST bases the frontend reads, their field groups and a Site Settings page. Existing pages, posts and URLs are untouched; a service only takes over an existing URL when its **Public path** field is set to it.

## 5. Next.js environment

See `frontend/.env.example`. Minimum for production: `WORDPRESS_API_URL`, `NEXT_PUBLIC_SITE_URL`. Revalidation and preview need the secrets above. After cutover add `WORDPRESS_MEDIA_ORIGIN` so `/wp-content/uploads/*` keeps resolving.
