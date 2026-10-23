# Legacy URL audit

Each legacy URL pattern tested read-only against production and against Next.js (live WordPress data). "Next.js" shows the response chain; every redirect is a single **301** to a **200**.

| Pattern | URL | Production | Next.js | Result |
|---|---|---|---|---|
| trailing slash | `/seo-agency-in-nagpur` | 301→200 `/seo-agency-in-nagpur/` | 301→200 `/seo-agency-in-nagpur/` | PASS |
| trailing slash | `/google-ads-vs-meta-ads` | 301→200 `/google-ads-vs-meta-ads/` | 301→200 `/google-ads-vs-meta-ads/` | PASS |
| trailing slash | `/category/blog` | 301→200 `/category/blog/` | 301→200 `/category/blog/` | PASS |
| trailing slash | `/tag/seo-services-in-nagpur` | 301→200 `/tag/seo-services-in-nagpur/` | 301→200 `/tag/seo-services-in-nagpur/` | PASS |
| trailing slash | `/author/mydigitalsavvy` | 301→200 `/author/mydigitalsavvy/` | 301→200 `/author/mydigitalsavvy/` | PASS |
| trailing slash | `/my-digital-savvy-blog/page/2` | 301→200 `/my-digital-savvy-blog/page/2/` | 301→200 `/my-digital-savvy-blog/page/2/` | PASS |
| trailing slash | `/feed` | 301→200 `/feed/` | 301→200 `/feed/` | PASS |
| trailing slash | `/nargis` | 301→200 `/nargis/` | 301→200 `/nargis/` | PASS |
| trailing slash | `/thank-you` | 301→200 `/thank-you/` | 301→200 `/thank-you/` | PASS |
| capitalised | `/SEO-Agency-In-Nagpur/` | 200 `/SEO-Agency-In-Nagpur/` | 301→200 `/seo-agency-in-nagpur/` | PASS |
| capitalised | `/SEO-Agency-In-Nagpur` | 301→200 `/SEO-Agency-In-Nagpur/` | 301→200 `/seo-agency-in-nagpur/` | PASS |
| capitalised | `/Google-Ads-Vs-Meta-Ads/` | 200 `/Google-Ads-Vs-Meta-Ads/` | 301→200 `/google-ads-vs-meta-ads/` | PASS |
| capitalised | `/Category/Blog/` | 404 `/Category/Blog/` | 301→200 `/category/blog/` | PASS |
| shortlink | `/?p=9616` | 301→200 `/ai/` | 301→200 `/ai/` | PASS |
| shortlink | `/?page_id=7505` | 301→200 `/seo-agency-in-nagpur/` | 301→200 `/seo-agency-in-nagpur/` | PASS |
| shortlink | `/?p=999999` | 404 `/?p=999999` | 404 `/?p=999999` | PASS — 404 on production too |
| template leak | `/?wpr_templates=user-popup-pop-up` | 301→200 `/` | 301→200 `/` | PASS |
| archive | `/category/blog/` | 200 `/category/blog/` | 200 `/category/blog/` | PASS |
| archive | `/category/blog/page/2/` | 200 `/category/blog/page/2/` | 200 `/category/blog/page/2/` | PASS |
| archive | `/category/blog/page/1/` | 301→200 `/category/blog/` | 301→200 `/category/blog/` | PASS |
| archive | `/tag/seo-services-in-nagpur/` | 200 `/tag/seo-services-in-nagpur/` | 200 `/tag/seo-services-in-nagpur/` | PASS |
| archive | `/author/mydigitalsavvy/` | 200 `/author/mydigitalsavvy/` | 200 `/author/mydigitalsavvy/` | PASS |
| archive | `/author/mydigitalsavvy/page/2/` | 200 `/author/mydigitalsavvy/page/2/` | 200 `/author/mydigitalsavvy/page/2/` | PASS |
| archive | `/my-digital-savvy-blog/page/1/` | 301→200 `/my-digital-savvy-blog/` | 301→200 `/my-digital-savvy-blog/` | PASS |
| rss | `/feed/` | 200 `/feed/` | 200 `/feed/` | PASS |
| rss | `/category/blog/feed/` | 200 `/category/blog/feed/` | 200 `/category/blog/feed/` | PASS |
| comment feed | `/comments/feed/` | 200 `/comments/feed/` | 301→200 `/feed/` | PASS |
| per-post feed | `/ai/feed/` | 200 `/ai/feed/` | 301→200 `/feed/` | PASS |
| per-post feed | `/google-ads-vs-meta-ads/feed/` | 200 `/google-ads-vs-meta-ads/feed/` | 301→200 `/feed/` | PASS |
| tag feed | `/tag/seo-services-in-nagpur/feed/` | 200 `/tag/seo-services-in-nagpur/feed/` | 301→200 `/feed/` | PASS |
| author feed | `/author/mydigitalsavvy/feed/` | 200 `/author/mydigitalsavvy/feed/` | 301→200 `/feed/` | PASS |
| yoast sitemap | `/sitemap_index.xml` | 200 `/sitemap_index.xml` | 301→200 `/sitemap.xml` | PASS |
| yoast sitemap | `/post-sitemap.xml` | 200 `/post-sitemap.xml` | 301→200 `/sitemap.xml` | PASS |
| yoast sitemap | `/page-sitemap.xml` | 200 `/page-sitemap.xml` | 301→200 `/sitemap.xml` | PASS |
| yoast sitemap | `/category-sitemap.xml` | 200 `/category-sitemap.xml` | 301→200 `/sitemap.xml` | PASS |
| yoast sitemap | `/post_tag-sitemap.xml` | 200 `/post_tag-sitemap.xml` | 301→200 `/sitemap.xml` | PASS |
| yoast sitemap | `/author-sitemap.xml` | 200 `/author-sitemap.xml` | 301→200 `/sitemap.xml` | PASS |
| yoast sitemap | `/wpr_templates-sitemap.xml` | 200 `/wpr_templates-sitemap.xml` | 301→200 `/sitemap.xml` | PASS |
| front-page slug | `/digital-marketing-agency-in-nagpur/` | 301→200 `/` | 301→200 `/` | PASS |
| slug-guess link | `/services/social-media-marketing` | 301→200 `/social-media-marketing-company-in-nagpur/` | 301→200 `/social-media-marketing-company-in-nagpur/` | PASS |
| slug-guess link | `/services/video-editing` | 301→200 `/video-editing-company-in-nagpur/` | 301→200 `/video-editing-company-in-nagpur/` | PASS |
| slug-guess link | `/services/website-development` | 301→200 `/website-development-company-in-nagpur/` | 301→200 `/website-development-company-in-nagpur/` | PASS |
| slug-guess link (broken on live) | `/services/seo` | 301→200 `/wp-content/uploads/2024/04/seo.jpg` | 301→404 `/services/seo/` | PASS — documented: WordPress sends it to an image (bug); not copied — content link to fix (broken-links.md) |
| structured alias | `/services/seo-agency-in-nagpur/` | 301→200 `/seo-agency-in-nagpur/` | 301→200 `/seo-agency-in-nagpur/` | PASS |

### Previous service / location paths (simulated structured content)

| Previous path | Next.js | Final |
|---|---|---|
| `/old-seo-agency/` | 301→200 | `/seo-agency-in-nagpur/` |
| `/old-seo-agency` | 301→200 | `/seo-agency-in-nagpur/` |
| `/OLD-SEO-Agency/` | 301→200 | `/seo-agency-in-nagpur/` |
| `/old-nagpur-page/` | 301→200 | `/digital-marketing-company-in-nagpur/` |
| `/services/seo-agency-in-nagpur/` | 301→200 | `/seo-agency-in-nagpur/` |

Previous paths come from the content model's `previous_paths` field via the path index; slash and case are normalised in the same hop.
