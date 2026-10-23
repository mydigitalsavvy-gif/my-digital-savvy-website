# Nagpur page overlap

Four indexed URLs target "digital marketing company / services in Nagpur". **Nothing has been changed, redirected or re-canonicalised.** All four are served by Next.js exactly as today and stay in the sitemap. This document separates what was measured from what would need a business decision.

Method: read-only. Titles, descriptions, canonicals and H1 from the live HTML; body text from the Next.js render of the same content; text overlap measured as shared 6-word sequences; inbound links counted from every live page and post body.

## Technical findings

| | `/digital-marketing-company-in-nagpur/` | `/nagpurs-best-digital-marketing-company/` | `/best-digital-marketing-services-in-nagpur/` | `/digital-marketing-services-in-nagpur/` |
|---|---|---|---|---|
| Type | Page (Elementor) | Page (Elementor) | Page (Elementor + custom HTML) | **Blog post** |
| HTTP (live / Next.js) | 200 / 200 | 200 / 200 | 200 / 200 | 200 / 200 |
| Title | Top Digital Marketing Company in Nagpur \| My Digital Savvy | Nagpur's Best Digital Marketing Company | Best Digital Marketing Services in Nagpur \| My Digital Savvy | Digital marketing services in nagpur- my digital savvy |
| H1 | Top Digital Marketing Company in Nagpur | Nagpur's Best Digital Marketing Company | Best Digital Marketing Services in Nagpur | none on live; Next.js: "Transform Your Online Presence: Digital Marketing Services in Nagpur" (post title) |
| Meta description | "My Digital Savvy is a Top Digital Marketing Company in Nagpur, helping businesses grow…" | "Elevate your business with Nagpur's Best Digital Marketing Company. Professional SEO, PPC…" | "Looking for the best digital marketing services in Nagpur? Get expert SEO, SMM, PPC…" | "Boost your business with top digital marketing services in Nagpur. Get expert SEO, social…" |
| What the body actually is | **About page** — About us, Our Team, Mission, Vision, "Empower your business" | **Contact page** — Contact Us, phone, map, enquiry form (form dropped by design) | **Services overview** — one card per service with "Read more" links to each service page | **Informational article** — why businesses in Nagpur need digital marketing |
| Search intent served | Brand / about (commercial keyword in title) | Contact / navigational (commercial keyword in title) | Commercial — service selection | Informational |
| Content depth | 487 words, 15 headings | 259 words, 6 headings | 586 words, 14 headings | 609 words, 1 heading |
| Unique body text | 97% | 91% | 96% | 100% |
| Shared with the others | ≤3% with each | 6% / 9% | 3–4% | 0% |
| Internal links out (content) | none beyond nav | none beyond nav | 9 service pages (1 broken) | blog index, `/best-digital-marketing-services-in-nagpur/` |
| Internal links in (page/post bodies) | 1 (homepage) | **11** (every service page + homepage — it is the site's contact link) | 3 (two posts + the Nagpur services post) | **0** |
| Canonical | self | self | self | self |
| Sitemap | yes | yes | yes | yes |

**Related, not in the four:** the homepage (title "Best Digital Marketing Agency in Nagpur - MY DIGITAL SAVVY") targets the same head term, and the posts `/advertising-agency-in-nagpur/` and `/digital-marketing-company-in-vidarbha/` target adjacent terms.

**Migration-created overlap (new):** the Next.js scaffold adds three **new** URLs with the same jobs as three of these pages — `/about/` (≈ the About page above), `/contact/` (≈ the Contact page above) and `/services/` (≈ the services overview above). They are in the new sitemap. They did not exist on WordPress.

### Technical classification

| URL | Class | Basis |
|---|---|---|
| `/digital-marketing-company-in-nagpur/` | **OVERLAPPING_INTENT** | Unique body (About), but title/H1 target the same head term as the homepage and the other two pages |
| `/nagpurs-best-digital-marketing-company/` | **CONTENT_REVIEW_REQUIRED** | Body is a contact page, title/H1 are a commercial keyword; most-linked of the four (11 inbound) |
| `/best-digital-marketing-services-in-nagpur/` | **POTENTIAL_CONSOLIDATION** | Same job as the new `/services/` hub; links to every service page |
| `/digital-marketing-services-in-nagpur/` | **OVERLAPPING_INTENT** | Informational post with a near-identical commercial title to the services page; orphaned (0 inbound links) |

The overlap is in **keyword targeting (titles/H1)**, not in duplicated copy: no two pages share more than 9% of their text.

## Recommendations requiring human approval

None of these are implemented. Each changes rankings and must be decided with Search Console data (clicks/impressions per URL for "digital marketing company/services in Nagpur") in hand.

1. **Give each page one distinct target.** e.g. homepage = "digital marketing agency in Nagpur"; services page = "digital marketing services in Nagpur"; About page = brand/about terms; Contact page = contact/brand terms. This is a title/H1 edit in Yoast/WordPress, not a URL change.
2. **New Next.js routes vs existing pages.** Choose one of: (a) keep `/about/`, `/contact/`, `/services/` and remove them from the sitemap / noindex them until decided; (b) point site navigation at the existing WordPress URLs instead; (c) later, after launch has settled, consolidate with 301s. Until decided, both sets exist.
3. **Blog post `/digital-marketing-services-in-nagpur/`.** Keep as informational and retitle away from the commercial term, or merge into the services page with a 301 — only if Search Console shows it does not rank on its own.
4. **Timing.** Any consolidation should happen **after** the platform cutover has stabilised (policy rule 10), never in the same release.
