# Internal link audit — 13 migrated pages

Every internal link inside the Next.js render of the 13 service/location pages (main content, excluding the shared header/footer/contact). Checked on Next.js (live WordPress data) and on production.

| Class | Count |
|---|---:|
| 301 | 3 |
| VALID | 44 |
| BROKEN | 5 |
| AMBIGUOUS | 2 |

| Page | Link | Anchor | Class | Next.js | Production |
|---|---|---|---|---|---|
| `/best-digital-marketing-services-in-nagpur/` | `/best-website-seo-agency-in-nagpur/` | Read More → | BROKEN | 404 `/best-website-seo-agency-in-nagpur/` | 404 `/best-website-seo-agency-in-nagpur/` |
| `/best-digital-marketing-company-in-indore/` | `/services/social-media-marketing` | Social Media Marketing | 301 | 301→200 `/social-media-marketing-company-in-nagpur/` | 301→200 `/social-media-marketing-company-in-nagpur/` |
| `/best-digital-marketing-company-in-indore/` | `/services/social-media-management` | Social Media Management | AMBIGUOUS | 301→404 `/services/social-media-management/` | 404 `/services/social-media-management` |
| `/best-digital-marketing-company-in-indore/` | `/services/seo` | SEO — Search Engine Optimization | BROKEN | 301→404 `/services/seo/` | 301→200 `/wp-content/uploads/2024/04/seo.jpg` |
| `/best-digital-marketing-company-in-indore/` | `/services/sem` | SEM — Search Engine Marketing | BROKEN | 301→404 `/services/sem/` | 404 `/services/sem` |
| `/best-digital-marketing-company-in-indore/` | `/services/graphic-designing` | Graphic Designing | BROKEN | 301→404 `/services/graphic-designing/` | 404 `/services/graphic-designing` |
| `/best-digital-marketing-company-in-indore/` | `/services/video-editing` | Video Editing | 301 | 301→200 `/video-editing-company-in-nagpur/` | 301→200 `/video-editing-company-in-nagpur/` |
| `/best-digital-marketing-company-in-indore/` | `/services/youtube-management` | YouTube Management | AMBIGUOUS | 301→404 `/services/youtube-management/` | 404 `/services/youtube-management` |
| `/best-digital-marketing-company-in-indore/` | `/services/website-development` | Website Development | 301 | 301→200 `/website-development-company-in-nagpur/` | 301→200 `/website-development-company-in-nagpur/` |
| `/best-digital-marketing-company-in-indore/` | `/services/local-seo-gmb` | Local SEO & GMB Optimization | BROKEN | 301→404 `/services/local-seo-gmb/` | 404 `/services/local-seo-gmb` |

The three **301** links depend on WordPress slug-guessing in production; Next.js has explicit one-hop rules for them (`config/redirects.ts`). BROKEN and AMBIGUOUS links are classified in `broken-links.md`; none were changed.
