import type { PathKind } from "@/types/content";

/**
 * How each EXISTING WordPress page renders until it is migrated into a
 * structured post type (Phase 6). Keyed by the live slug. Nothing here
 * changes a URL: it only picks the view template.
 *
 * Source: read-only audit of https://mydigitalsavvy.com/wp-json (17 pages).
 * Pages not listed render as a generic page. The WordPress front page is
 * detected by its permalink ("/") and never by this table.
 */
export const LEGACY_PAGE_KINDS: Record<
  string,
  {
    kind: Exclude<PathKind, "post" | "front-page">;
    catalogueSlug?: string;
    city?: string;
  }
> = {
  // Service landing pages → homepage service catalogue entry (icon, deliverables).
  "seo-agency-in-nagpur": {
    kind: "service",
    catalogueSlug: "search-engine-optimization",
  },
  "best-sem-services-in-nagpur": {
    kind: "service",
    catalogueSlug: "search-engine-marketing",
  },
  "social-media-marketing-company-in-nagpur": {
    kind: "service",
    catalogueSlug: "social-media-marketing",
  },
  "social-media-optimization-company-in-nagpur": { kind: "service" },
  "website-development-company-in-nagpur": {
    kind: "service",
    catalogueSlug: "website-development",
  },
  "video-editing-company-in-nagpur": {
    kind: "service",
    catalogueSlug: "video-editing",
  },
  "graphic-design-agency-in-nagpur": {
    kind: "service",
    catalogueSlug: "graphic-designing",
  },
  "youtube-seo-services-in-nagpur": {
    kind: "service",
    catalogueSlug: "youtube-management",
  },
  "local-seo-services-in-nagpur": {
    kind: "service",
    catalogueSlug: "local-seo-gmb-optimization",
  },

  // City landing pages. The four Nagpur pages compete for one keyword;
  // consolidation is a WordPress-side decision (see docs/phase-5).
  "digital-marketing-company-in-nagpur": { kind: "location", city: "Nagpur" },
  "nagpurs-best-digital-marketing-company": {
    kind: "location",
    city: "Nagpur",
  },
  "best-digital-marketing-services-in-nagpur": {
    kind: "location",
    city: "Nagpur",
  },
  "best-digital-marketing-company-in-indore": {
    kind: "location",
    city: "Indore",
  },

  // Blog index (WordPress "posts page").
  "my-digital-savvy-blog": { kind: "blog-index" },
};

/** WordPress shows 10 posts per archive page on the live site (3 pages for 21 posts). */
export const DEFAULT_POSTS_PER_PAGE = 10;
