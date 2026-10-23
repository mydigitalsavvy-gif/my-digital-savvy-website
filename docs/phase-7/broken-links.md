# Broken content links

**Correction:** Phase 6 reported "six" broken links. The full audit finds **seven** problem links (six that return 404 and one that WordPress redirects to an image). All seven are already broken on the live site. **No link has been changed.**

All are inside page content that WordPress serves today; fixes are content edits (in the Elementor page now, or in the structured draft before it is published).

| # | Source page | Broken URL | HTTP (live) | Anchor text | Likely intended destination | Confidence | Recommended action |
|---|---|---|---|---|---|---|---|
| 1 | `/best-digital-marketing-company-in-indore/` | `/services/seo` | 301 → `/wp-content/uploads/2024/04/seo.jpg` (an image) | SEO — Search Engine Optimization | `/seo-agency-in-nagpur/` | High | **FIX_BEFORE_LAUNCH** |
| 2 | `/best-digital-marketing-company-in-indore/` | `/services/sem` | 404 | SEM — Search Engine Marketing | `/best-sem-services-in-nagpur/` | High | **FIX_BEFORE_LAUNCH** |
| 3 | `/best-digital-marketing-company-in-indore/` | `/services/graphic-designing` | 404 | Graphic Designing | `/graphic-design-agency-in-nagpur/` | High | **FIX_BEFORE_LAUNCH** |
| 4 | `/best-digital-marketing-company-in-indore/` | `/services/local-seo-gmb` | 404 | Local SEO & GMB Optimization | `/local-seo-services-in-nagpur/` | High | **FIX_BEFORE_LAUNCH** |
| 5 | `/best-digital-marketing-services-in-nagpur/` | `/best-website-seo-agency-in-nagpur/` | 404 | Read More → (under "Search Engine Optimization (SEO)") | `/seo-agency-in-nagpur/` (its H1 is "Best Website SEO Agency in Nagpur") | High | **FIX_BEFORE_LAUNCH** |
| 6 | `/best-digital-marketing-company-in-indore/` | `/services/social-media-management` | 404 | Social Media Management | No dedicated page. Candidates: `/social-media-optimization-company-in-nagpur/` or `/social-media-marketing-company-in-nagpur/` | Low | **HUMAN_REVIEW** |
| 7 | `/best-digital-marketing-company-in-indore/` | `/services/youtube-management` | 404 | YouTube Management | `/youtube-seo-services-in-nagpur/` (page is "YouTube SEO & Channel Growth"; management ≠ SEO) | Medium | **HUMAN_REVIEW** |

## Links that work only through WordPress slug-guessing

These are not broken today, and Next.js keeps them working with explicit one-hop 301s (`frontend/config/redirects.ts`). Pointing them straight at the final URL is optional cleanup.

| Source page | Link | Live and Next.js behaviour | Optional cleanup |
|---|---|---|---|
| `/best-digital-marketing-company-in-indore/` | `/services/social-media-marketing` | 301 → `/social-media-marketing-company-in-nagpur/` | Link directly |
| `/best-digital-marketing-company-in-indore/` | `/services/video-editing` | 301 → `/video-editing-company-in-nagpur/` | Link directly |
| `/best-digital-marketing-company-in-indore/` | `/services/website-development` | 301 → `/website-development-company-in-nagpur/` | Link directly |

## Why no redirects were added for the broken URLs

The broken URLs were never real pages (they never returned 200), so adding redirects would invent URL behaviour rather than preserve it. The correct fix is the link itself. Next.js does not prefetch content links, so these broken targets produce no background errors.
