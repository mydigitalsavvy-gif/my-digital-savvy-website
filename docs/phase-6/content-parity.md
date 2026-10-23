# Content parity — batch 1 (13 service and location pages)

Three-way comparison for every page:

- **OLD** — the page body WordPress stores and the live Elementor site renders (`/wp-json/wp/v2/pages/<id>`), plus the live HTML for title, meta and H1.
- **STRUCTURED** — the draft payload in `wordpress/migration/batch-1/<slug>.json` (what the importer would write into the structured fields).
- **NEXT** — Next.js rendering that structured content after a simulated import + publish (mock WordPress serving the payloads as published `service` / `location_page` posts that take over their URLs).

Text coverage = share of OLD text units (headings, paragraphs, list items) found verbatim (normalised) in STRUCTURED / NEXT. Widgets dropped by design (buttons, counters, forms, Lottie shortcodes, social icons, map iframes) are counted separately.

| URL | Kind | Status | H1 | SEO (title, desc, canonical, robots, OG) | Text STRUCT | Text NEXT | Text units | Images | Internal links | Contact | CTA | Schema | Sitemap | Dropped by design |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/best-digital-marketing-company-in-indore/` | location | 200 | same | same | 100% | 100% | 7 | 1/1 | 10/10 | yes | yes | Organization+BreadcrumbList | yes | 7 |
| `/best-digital-marketing-services-in-nagpur/` | location | 200 | same | same | 100% | 100% | 18 | 1/1 | 9/9 | yes | yes | Organization+BreadcrumbList | yes | 8 |
| `/best-sem-services-in-nagpur/` | service | 200 | same | same | 100% | 100% | 71 | 7/7 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 9 |
| `/digital-marketing-company-in-nagpur/` | location | 200 | same | same | 100% | 100% | 28 | 2/2 | 0/0 | yes | yes | Organization+BreadcrumbList | yes | 3 |
| `/graphic-design-agency-in-nagpur/` | service | 200 | same | same | 100% | 100% | 78 | 7/7 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 8 |
| `/local-seo-services-in-nagpur/` | service | 200 | same | same | 100% | 100% | 48 | 1/1 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 9 |
| `/nagpurs-best-digital-marketing-company/` | location | 200 | same | same | 100% | 100% | 15 | 1/1 | 0/0 | yes | yes | Organization+BreadcrumbList | yes | 3 |
| `/seo-agency-in-nagpur/` | service | 200 | same | same | 100% | 100% | 47 | 2/2 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 8 |
| `/social-media-marketing-company-in-nagpur/` | service | 200 | same | same | 100% | 100% | 57 | 4/4 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 9 |
| `/social-media-optimization-company-in-nagpur/` | service | 200 | same | same | 100% | 100% | 68 | 7/7 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 8 |
| `/video-editing-company-in-nagpur/` | service | 200 | same | same | 100% | 100% | 49 | 5/5 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 8 |
| `/website-development-company-in-nagpur/` | service | 200 | same | same | 100% | 100% | 58 | 4/4 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 8 |
| `/youtube-seo-services-in-nagpur/` | service | 200 | same | same | 100% | 100% | 83 | 9/9 | 0/0 | yes | yes | Organization+BreadcrumbList+Service | yes | 9 |

**Result:** nothing in the page bodies disappears. 13/13 pages keep 100% of their text, every image and every internal link, the live H1, and identical title, description, canonical, robots and Open Graph values.

## Structured mapping per page

| Page | H1 (hero) | Body blocks | Process steps | Benefits (from feature cards) | Images | Editorial gaps |
|---|---|---|---|---|---|---|
| `seo-agency-in-nagpur` | Best Website SEO Agency in Nagpur | 25 | 8 | 0 | 2 | 4 |
| `best-sem-services-in-nagpur` | BEST SEM SERVICES IN NAGPUR – MY DIGITAL SAVVY | 33 | 0 | 6 | 1 | 3 |
| `social-media-marketing-company-in-nagpur` | BEST Social Media Marketing Company in Nagpur | 29 | 0 | 3 | 1 | 3 |
| `social-media-optimization-company-in-nagpur` | BEST SOCIAL MEDIA OPTIMIZATION COMPANY IN NAGPUR | 34 | 0 | 6 | 1 | 4 |
| `website-development-company-in-nagpur` | Best Website Development Company in Nagpur | 31 | 0 | 3 | 1 | 3 |
| `video-editing-company-in-nagpur` | Best Video Editing Company In Nagpur | 28 | 0 | 4 | 1 | 3 |
| `graphic-design-agency-in-nagpur` | BEST GRAPHIC DESIGN AGENCY IN NAGPUR | 34 | 0 | 6 | 1 | 3 |
| `youtube-seo-services-in-nagpur` | BEST YOUTUBE SEO SERVICES IN NAGPUR | 38 | 0 | 8 | 1 | 3 |
| `local-seo-services-in-nagpur` | Best Local SEO Services in Nagpur | 29 | 0 | 0 | 1 | 4 |
| `digital-marketing-company-in-nagpur` | Top Digital Marketing Company in Nagpur | 19 | 0 | 0 | 2 | 2 |
| `nagpurs-best-digital-marketing-company` | Nagpur’s Best Digital Marketing Company | 12 | 0 | 0 | 1 | 2 |
| `best-digital-marketing-services-in-nagpur` | Best Digital Marketing Services in Nagpur | 36 | 0 | 0 | 1 | 2 |
| `best-digital-marketing-company-in-indore` | Best Digital Marketing Company in Indore | 43 | 0 | 0 | 1 | 2 |

Editorial gaps are fields with no source content on the old page (for example `short_description`, FAQs, related case studies). They are left **empty**, never filled with invented copy. Each payload lists them under `review.editorial_gaps`.

## Content issues found on the live site (not changed)

| Page | Link in content | Live behaviour | Next.js behaviour | Suggested editorial fix |
|---|---|---|---|---|
| `/best-digital-marketing-company-in-indore/` | `/services/social-media-management`, `/services/sem`, `/services/graphic-designing`, `/services/youtube-management`, `/services/local-seo-gmb` | 404 | 404 | Point to the matching service page |
| `/best-digital-marketing-company-in-indore/` | `/services/seo` | 301 to an image (`/wp-content/uploads/2024/04/seo.jpg`) — WordPress slug guessing | 404 (broken guess not copied) | Point to `/seo-agency-in-nagpur/` |
| `/best-digital-marketing-company-in-indore/` | `/services/social-media-marketing`, `/services/video-editing`, `/services/website-development` | 301 to the right service page (slug guessing) | Same 301 (preserved in `next.config.ts`) | Point directly at the service page |
| `/best-digital-marketing-services-in-nagpur/` | `/best-website-seo-agency-in-nagpur/` | 404 | 404 | Point to `/seo-agency-in-nagpur/` |
