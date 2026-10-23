# Launch blockers

State after Phase 7 (Next.js on live WordPress data, read-only). "Owner" says who can clear it.

## CRITICAL

| # | Issue | Why it blocks | Owner | Status |
|---|---|---|---|---|
| C1 | No production WordPress access and no verified backup | Cutover, content import, revalidation and preview all depend on it; no rollback without a backup | Site owner | Open |

No CRITICAL **SEO** issues remain in Next.js: no redirect loops, no chains, no wrong canonicals, no lost indexed URLs (94/94 reconciled).

## HIGH

| # | Issue | Impact | Owner | Status |
|---|---|---|---|---|
| H1 | Homepage H1 changes from "MY DIGITAL SAVVY - Best Digital Marketing Agency in Nagpur" to the frozen design's "Marketing that pays for itself in hospitality." (DOM text also repeats the rotor word: "hospitality.hospitality.") | The homepage's main keyword leaves the H1. Title, description and canonical are unchanged | Human decision (design frozen) | Open |
| H2 | 5 broken content links with an unambiguous fix + 2 needing review (`broken-links.md`) | Broken important internal links on two location pages (already broken on production) | Content editor | Open |
| H3 | Cutover rule: `WORDPRESS_MEDIA_ORIGIN` must be set when DNS moves | Without it every `/wp-content/uploads/*` image on the main domain 404s | Developer at cutover | Implemented, must be configured |
| H4 | Cutover rule: `/nargis/` and `/nargis/*` must be excluded from any WordPress-frontend redirect | Otherwise the business card loops or disappears | Developer at cutover | Documented |

## MEDIUM

| # | Issue | Impact | Owner |
|---|---|---|---|
| M1 | Four Nagpur pages target the same head term (`nagpur-page-overlap.md`) | Keyword cannibalisation (pre-existing) | Human decision |
| M2 | New Next.js URLs `/about/`, `/contact/`, `/services/` duplicate the jobs of three indexed WordPress pages and are in the sitemap | New overlap created by the migration | Human decision |
| M3 | Search Console: new sitemap must be submitted and the 7 Yoast sitemap URLs now 301 | Discovery delay if forgotten | Developer at cutover |
| M4 | Production preview/revalidation untested against real WordPress | Editors' workflow unproven until the bridge plugin is installed | After C1 |

## LOW

| # | Issue | Note |
|---|---|---|
| L1 | `/nargis/` favicon request returns 404 | Identical on production (page declares no icon). **Not a migration blocker.** |
| L2 | Next.js adds `twitter:title/description/image` copied from Open Graph | Values identical to OG; Yoast relies on the same fallback. No ranking impact |
| L3 | Capitalised URLs now 301 to lowercase (production serves a duplicate 200) | Same canonical as Yoast; consolidates duplicates |
| L4 | Secondary feeds (comment/per-post/tag/author) 301 to `/feed/` | Intentional; feed readers follow 301 |
| L5 | Blog posts gain an H1 (production has none) | Improvement |
