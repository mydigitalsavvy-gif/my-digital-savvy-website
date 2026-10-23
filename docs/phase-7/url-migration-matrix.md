# URL migration matrix (94 URLs)

Source: every URL in the live Yoast sitemaps plus the real WordPress URLs outside them (pagination, feeds, shortlinks, front-page slug, case and slash variants, out-of-range and nonexistent controls). Checked read-only against production and against the Next.js build running on live WordPress data.

**HTTP** = Next.js first response (live in brackets when different). **Final URL** = where the request ends after following redirects. Every redirect is exactly one 301 to a 200.

| Current URL | HTTP | Content Type | Next.js Route | Action | Final URL | Canonical | Notes |
|---|---:|---|---|---|---|---|---|
| `/my-digital-savvy-blog/` | 200 | Blog index | app/[slug] | **KEEP** | `/my-digital-savvy-blog/` | /my-digital-savvy-blog/ |  |
| `/difference-between-smo-and-smm/` | 200 | Blog post | app/[slug] | **KEEP** | `/difference-between-smo-and-smm/` | /difference-between-smo-and-smm/ |  |
| `/importance-of-digital-marketing/` | 200 | Blog post | app/[slug] | **KEEP** | `/importance-of-digital-marketing/` | /importance-of-digital-marketing/ |  |
| `/what-is-search-engine-optimization/` | 200 | Blog post | app/[slug] | **KEEP** | `/what-is-search-engine-optimization/` | /what-is-search-engine-optimization/ |  |
| `/seo-strategies/` | 200 | Blog post | app/[slug] | **KEEP** | `/seo-strategies/` | /seo-strategies/ |  |
| `/branding-vs-marketing-strategy/` | 200 | Blog post | app/[slug] | **KEEP** | `/branding-vs-marketing-strategy/` | /branding-vs-marketing-strategy/ |  |
| `/social-media-branding-strategy/` | 200 | Blog post | app/[slug] | **KEEP** | `/social-media-branding-strategy/` | /social-media-branding-strategy/ |  |
| `/instagram-organic-reach/` | 200 | Blog post | app/[slug] | **KEEP** | `/instagram-organic-reach/` | /instagram-organic-reach/ |  |
| `/influencer-marketing-strategy/` | 200 | Blog post | app/[slug] | **KEEP** | `/influencer-marketing-strategy/` | /influencer-marketing-strategy/ |  |
| `/business-marketing-plan/` | 200 | Blog post | app/[slug] | **KEEP** | `/business-marketing-plan/` | /business-marketing-plan/ |  |
| `/digital-marketing-company-in-vidarbha/` | 200 | Blog post | app/[slug] | **KEEP** | `/digital-marketing-company-in-vidarbha/` | /digital-marketing-company-in-vidarbha/ |  |
| `/advertising-agency-in-nagpur/` | 200 | Blog post | app/[slug] | **KEEP** | `/advertising-agency-in-nagpur/` | /advertising-agency-in-nagpur/ |  |
| `/future-of-digital-marketing/` | 200 | Blog post | app/[slug] | **KEEP** | `/future-of-digital-marketing/` | /future-of-digital-marketing/ |  |
| `/digital-marketing-services-in-nagpur/` | 200 | Blog post | app/[slug] | **CONTENT_REVIEW** | `/digital-marketing-services-in-nagpur/` | /digital-marketing-services-in-nagpur/ | served unchanged; overlap decision pending (nagpur-page-overlap.md) |
| `/why-digital-marketing-is-growing-in-nagpur/` | 200 | Blog post | app/[slug] | **KEEP** | `/why-digital-marketing-is-growing-in-nagpur/` | /why-digital-marketing-is-growing-in-nagpur/ |  |
| `/why-every-business-need-digital-marketing-services-in-2024/` | 200 | Blog post | app/[slug] | **KEEP** | `/why-every-business-need-digital-marketing-services-in-2024/` | /why-every-business-need-digital-marketing-services-in-2024/ |  |
| `/how-to-convert-traffic-into-leads/` | 200 | Blog post | app/[slug] | **KEEP** | `/how-to-convert-traffic-into-leads/` | /how-to-convert-traffic-into-leads/ |  |
| `/personal-branding-on-social-media/` | 200 | Blog post | app/[slug] | **KEEP** | `/personal-branding-on-social-media/` | /personal-branding-on-social-media/ |  |
| `/why-you-should-choose-wordpress/` | 200 | Blog post | app/[slug] | **KEEP** | `/why-you-should-choose-wordpress/` | /why-you-should-choose-wordpress/ |  |
| `/digital-marketing-agency/` | 200 | Blog post | app/[slug] | **KEEP** | `/digital-marketing-agency/` | /digital-marketing-agency/ |  |
| `/ai/` | 200 | Blog post | app/[slug] | **KEEP** | `/ai/` | /ai/ |  |
| `/google-ads-vs-meta-ads/` | 200 | Blog post | app/[slug] | **KEEP** | `/google-ads-vs-meta-ads/` | /google-ads-vs-meta-ads/ |  |
| `/` | 200 | Front page | app/page.tsx | **KEEP** | `/` | / |  |
| `/local-seo-services-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/local-seo-services-in-nagpur/` | /local-seo-services-in-nagpur/ |  |
| `/best-digital-marketing-company-in-indore/` | 200 | Location page | app/[slug] | **KEEP** | `/best-digital-marketing-company-in-indore/` | /best-digital-marketing-company-in-indore/ | contains 6 broken content links (broken-links.md) |
| `/nagpurs-best-digital-marketing-company/` | 200 | Location page | app/[slug] | **CONTENT_REVIEW** | `/nagpurs-best-digital-marketing-company/` | /nagpurs-best-digital-marketing-company/ | served unchanged; overlap decision pending (nagpur-page-overlap.md) |
| `/best-digital-marketing-services-in-nagpur/` | 200 | Location page | app/[slug] | **CONTENT_REVIEW** | `/best-digital-marketing-services-in-nagpur/` | /best-digital-marketing-services-in-nagpur/ | served unchanged; overlap decision pending (nagpur-page-overlap.md); contains 1 broken content link (broken-links.md) |
| `/best-sem-services-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/best-sem-services-in-nagpur/` | /best-sem-services-in-nagpur/ |  |
| `/social-media-marketing-company-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/social-media-marketing-company-in-nagpur/` | /social-media-marketing-company-in-nagpur/ |  |
| `/youtube-seo-services-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/youtube-seo-services-in-nagpur/` | /youtube-seo-services-in-nagpur/ |  |
| `/website-development-company-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/website-development-company-in-nagpur/` | /website-development-company-in-nagpur/ |  |
| `/video-editing-company-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/video-editing-company-in-nagpur/` | /video-editing-company-in-nagpur/ |  |
| `/social-media-optimization-company-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/social-media-optimization-company-in-nagpur/` | /social-media-optimization-company-in-nagpur/ |  |
| `/graphic-design-agency-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/graphic-design-agency-in-nagpur/` | /graphic-design-agency-in-nagpur/ |  |
| `/digital-marketing-company-in-nagpur/` | 200 | Location page | app/[slug] | **CONTENT_REVIEW** | `/digital-marketing-company-in-nagpur/` | /digital-marketing-company-in-nagpur/ | served unchanged; overlap decision pending (nagpur-page-overlap.md) |
| `/seo-agency-in-nagpur/` | 200 | Service page | app/[slug] | **KEEP** | `/seo-agency-in-nagpur/` | /seo-agency-in-nagpur/ |  |
| `/nargis/` | 200 | Page (custom template) | rewrite → WordPress (passthrough) | **SPECIAL_CASE** | `/nargis/` | none (identical to live) | CONTENT_REVIEW_REQUIRED business card; byte-identical passthrough incl. /nargis/photo.png and /nargis/nargis.vcf; must be excluded from any WordPress-frontend redirect at cutover |
| `/?wpr_templates=user-popup-pop-up` | 301 | Elementor template (leaked) | rewrite → app/shortlink/[id] | **301** | `/` | — | EXCLUDE_FROM_SITEMAP; WordPress 301s it home, preserved |
| `/category/blog/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/blog/` | /category/blog/ |  |
| `/category/content-creation-services-in-nagpur/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/content-creation-services-in-nagpur/` | /category/content-creation-services-in-nagpur/ |  |
| `/category/digital-marketing-services-in-vidharbha/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/digital-marketing-services-in-vidharbha/` | /category/digital-marketing-services-in-vidharbha/ |  |
| `/category/digital-marketing-vs-ai/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/digital-marketing-vs-ai/` | /category/digital-marketing-vs-ai/ |  |
| `/category/search-engine-marketing-company-in-nagpur/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/search-engine-marketing-company-in-nagpur/` | /category/search-engine-marketing-company-in-nagpur/ |  |
| `/category/search-engine-optimization-services-in-nagpur/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/search-engine-optimization-services-in-nagpur/` | /category/search-engine-optimization-services-in-nagpur/ |  |
| `/category/best-social-media-marketing-company-in-nagpur/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/best-social-media-marketing-company-in-nagpur/` | /category/best-social-media-marketing-company-in-nagpur/ |  |
| `/category/best-social-media-company-in-nagpur/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/best-social-media-company-in-nagpur/` | /category/best-social-media-company-in-nagpur/ |  |
| `/category/website-development-company-in-nagpur/` | 200 | Category archive | app/category/[slug]/[[...rest]] | **KEEP** | `/category/website-development-company-in-nagpur/` | /category/website-development-company-in-nagpur/ |  |
| `/tag/advantages-of-digital-marketing/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/advantages-of-digital-marketing/` | /tag/advantages-of-digital-marketing/ |  |
| `/tag/benefits-of-digital-marketing/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/benefits-of-digital-marketing/` | /tag/benefits-of-digital-marketing/ |  |
| `/tag/best-digital-marketing-agency-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/best-digital-marketing-agency-in-nagpur/` | /tag/best-digital-marketing-agency-in-nagpur/ |  |
| `/tag/best-digital-marketing-agency-in-vidarbha/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/best-digital-marketing-agency-in-vidarbha/` | /tag/best-digital-marketing-agency-in-vidarbha/ |  |
| `/tag/difference-between-smo-and-smm/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/difference-between-smo-and-smm/` | /tag/difference-between-smo-and-smm/ |  |
| `/tag/digital-marketing-agency-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-agency-in-nagpur/` | /tag/digital-marketing-agency-in-nagpur/ |  |
| `/tag/digital-marketing-company-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-company-in-nagpur/` | /tag/digital-marketing-company-in-nagpur/ |  |
| `/tag/digital-marketing-company-in-vidarbha/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-company-in-vidarbha/` | /tag/digital-marketing-company-in-vidarbha/ |  |
| `/tag/digital-marketing-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-in-nagpur/` | /tag/digital-marketing-in-nagpur/ |  |
| `/tag/digital-marketing-service-in-vidarbha/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-service-in-vidarbha/` | /tag/digital-marketing-service-in-vidarbha/ |  |
| `/tag/digital-marketing-services-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-services-in-nagpur/` | /tag/digital-marketing-services-in-nagpur/ |  |
| `/tag/digital-marketing-strategies/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-strategies/` | /tag/digital-marketing-strategies/ |  |
| `/tag/digital-marketing-trends-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/digital-marketing-trends-in-nagpur/` | /tag/digital-marketing-trends-in-nagpur/ |  |
| `/tag/importance-of-digital-marketing/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/importance-of-digital-marketing/` | /tag/importance-of-digital-marketing/ |  |
| `/tag/importance-of-digital-marketing-for-small-businesses/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/importance-of-digital-marketing-for-small-businesses/` | /tag/importance-of-digital-marketing-for-small-businesses/ |  |
| `/tag/nagpur-digital-marketing-growth/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/nagpur-digital-marketing-growth/` | /tag/nagpur-digital-marketing-growth/ |  |
| `/tag/role-of-digital-marketing-in-business-growth/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/role-of-digital-marketing-in-business-growth/` | /tag/role-of-digital-marketing-in-business-growth/ |  |
| `/tag/seo-services-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/seo-services-in-nagpur/` | /tag/seo-services-in-nagpur/ |  |
| `/tag/social-media-marketing-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/social-media-marketing-in-nagpur/` | /tag/social-media-marketing-in-nagpur/ |  |
| `/tag/top-10-digital-marketing-companies-vidarbha/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/top-10-digital-marketing-companies-vidarbha/` | /tag/top-10-digital-marketing-companies-vidarbha/ |  |
| `/tag/top-advertising-agency-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/top-advertising-agency-in-nagpur/` | /tag/top-advertising-agency-in-nagpur/ |  |
| `/tag/top-digital-marketing-companies-vidarbha/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/top-digital-marketing-companies-vidarbha/` | /tag/top-digital-marketing-companies-vidarbha/ |  |
| `/tag/website-development-company-in-nagpur/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/website-development-company-in-nagpur/` | /tag/website-development-company-in-nagpur/ |  |
| `/tag/what-is-search-engine-optimization/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/what-is-search-engine-optimization/` | /tag/what-is-search-engine-optimization/ |  |
| `/tag/why-digital-marketing-is-important/` | 200 | Tag archive | app/tag/[slug]/[[...rest]] | **KEEP** | `/tag/why-digital-marketing-is-important/` | /tag/why-digital-marketing-is-important/ |  |
| `/author/mydigitalsavvy/` | 200 | Author archive | app/author/[slug]/[[...rest]] | **KEEP** | `/author/mydigitalsavvy/` | /author/mydigitalsavvy/ |  |
| `/digital-marketing-agency-in-nagpur/` | 301 | front-page slug | app/[slug] | **301** | `/` | — | front-page slug; WordPress 301s to /, preserved |
| `/thank-you/` | 200 | page (noindex) | app/[slug] | **KEEP** | `/thank-you/` | /thank-you/ | Yoast noindex kept; excluded from sitemap |
| `/my-digital-savvy-blog/page/2/` | 200 | Archive pagination | app/[slug]/page/[page] | **KEEP** | `/my-digital-savvy-blog/page/2/` | /my-digital-savvy-blog/page/2/ |  |
| `/my-digital-savvy-blog/page/3/` | 200 | Archive pagination | app/[slug]/page/[page] | **KEEP** | `/my-digital-savvy-blog/page/3/` | /my-digital-savvy-blog/page/3/ |  |
| `/category/blog/page/2/` | 200 | Archive pagination | app/category/[slug]/[[...rest]] | **KEEP** | `/category/blog/page/2/` | /category/blog/page/2/ |  |
| `/author/mydigitalsavvy/page/2/` | 200 | Archive pagination | app/author/[slug]/[[...rest]] | **KEEP** | `/author/mydigitalsavvy/page/2/` | /author/mydigitalsavvy/page/2/ |  |
| `/feed/` | 200 | Site RSS feed | app/feed/route.ts | **KEEP** | `/feed/` | — |  |
| `/comments/feed/` | 301 (live 200) | Comment feed | proxy.ts (301) | **301** | `/feed/` | — | intentional: secondary feed → site feed |
| `/category/blog/feed/` | 200 | Category feed | app/category/[slug]/feed | **KEEP** | `/category/blog/feed/` | — |  |
| `/ai/feed/` | 301 (live 200) | Per-post feed | proxy.ts (301) | **301** | `/feed/` | — | intentional: secondary feed → site feed |
| `/tag/seo-services-in-nagpur/feed/` | 301 (live 200) | Tag feed | proxy.ts (301) | **301** | `/feed/` | — | intentional: secondary feed → site feed |
| `/author/mydigitalsavvy/feed/` | 301 (live 200) | Author feed | proxy.ts (301) | **301** | `/feed/` | — | intentional: secondary feed → site feed |
| `/sitemap_index.xml` | 301 (live 200) | Yoast sitemap | proxy.ts (301) | **301** | `/sitemap.xml` | — | intentional: Yoast sitemap → /sitemap.xml |
| `/post-sitemap.xml` | 301 (live 200) | Yoast sitemap | proxy.ts (301) | **301** | `/sitemap.xml` | — | intentional: Yoast sitemap → /sitemap.xml |
| `/page-sitemap.xml` | 301 (live 200) | Yoast sitemap | proxy.ts (301) | **301** | `/sitemap.xml` | — | intentional: Yoast sitemap → /sitemap.xml |
| `/?p=9616` | 301 | Shortlink | rewrite → app/shortlink/[id] | **301** | `/ai/` | — | WordPress shortlink, same target as live |
| `/?page_id=7505` | 301 | Shortlink | rewrite → app/shortlink/[id] | **301** | `/seo-agency-in-nagpur/` | — | WordPress shortlink, same target as live |
| `/SEO-Agency-In-Nagpur/` | 301 (live 200) | case variant | proxy.ts (301) | **301** | `/seo-agency-in-nagpur/` | — | live serves a duplicate 200 (Yoast canonical = lowercase); Next.js 301s to the canonical |
| `/seo-agency-in-nagpur` | 301 | no trailing slash | proxy.ts (301) | **301** | `/seo-agency-in-nagpur/` | — | missing trailing slash; same 301 as live |
| `/my-digital-savvy-blog/page/9/` | 404 | Archive pagination | app/[slug]/page/[page] | **DO_NOT_MIGRATE** | `/my-digital-savvy-blog/page/9/` | — | 404 on live too |
| `/this-page-never-existed/` | 404 | nonexistent | app/[slug] | **DO_NOT_MIGRATE** | `/this-page-never-existed/` | — | 404 on live too |

**Totals:** 301 13 · KEEP 74 · CONTENT_REVIEW 4 · SPECIAL_CASE 1 · DO_NOT_MIGRATE 2 = 94
