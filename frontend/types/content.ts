/**
 * Normalized content models for every non-homepage view.
 *
 * Components import ONLY these types. Raw WordPress REST shapes stay
 * inside lib/wordpress/* and are converted by normalizers, so a CMS field
 * rename never reaches JSX.
 */

/* ── Inline + block content ──────────────────────────────────────── */

/** Inline text. Links are already rewritten to site-relative paths where internal. */
export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; external: boolean; children: Inline[] }
  | { type: "break" };

export interface ImageAsset {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

/**
 * Structured content block. WordPress/Elementor HTML is parsed into these
 * on the server; nothing renders CMS HTML directly.
 */
export type ContentBlock =
  | {
      type: "heading";
      level: 2 | 3 | 4;
      content: Inline[];
      /** Was an <h1> in the WordPress markup (the ranking H1 on legacy pages). */
      fromH1?: boolean;
    }
  | { type: "paragraph"; content: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "image"; image: ImageAsset; caption: Inline[] | null }
  | { type: "steps"; items: { title: string; body: ContentBlock[] }[] }
  /** Feature cards (Elementor image-box / icon-box widgets). */
  | { type: "cards"; items: CardItem[] }
  | { type: "quote"; content: Inline[] };

export interface CardItem {
  title: string;
  body: Inline[];
  image: ImageAsset | null;
}

export interface Faq {
  question: string;
  answer: ContentBlock[];
}

/* ── SEO ─────────────────────────────────────────────────────────── */

export interface SeoRobots {
  index: boolean;
  follow: boolean;
  maxSnippet: number | null;
  maxImagePreview: "none" | "standard" | "large" | null;
  maxVideoPreview: number | null;
}

/** Yoast data, normalized. `canonical` is already rewritten to the public site origin. */
export interface SeoModel {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: SeoRobots | null;
  ogType: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: ImageAsset | null;
  twitterCard: "summary" | "summary_large_image" | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  /** Yoast twitter_misc, e.g. { "Written by": "…", "Est. reading time": "4 minutes" } */
  twitterMisc: Record<string, string> | null;
  publishedTime: string | null;
  modifiedTime: string | null;
}

/* ── Path index ──────────────────────────────────────────────────── */

export type PathKind =
  | "front-page"
  | "blog-index"
  | "service"
  | "location"
  | "post"
  | "page"
  | "case-study"
  | "industry"
  | "portfolio";

/** One resolvable public URL. Paths always start and end with "/". */
export interface PathEntry {
  path: string;
  kind: PathKind;
  /** WordPress object type: page, post, service, location_page, … */
  wpType: string;
  id: number;
  slug: string;
  title: string;
  modified: string | null;
  /** Older URLs that 301 to `path`. */
  previousPaths: string[];
  /** Homepage service catalogue slug this page corresponds to, when known. */
  catalogueSlug: string | null;
  /** Yoast says noindex (kept out of the sitemap). */
  noindex?: boolean;
}

export interface PathIndex {
  entries: PathEntry[];
  /** previous path → current path */
  redirects: Record<string, string>;
  blogIndexPath: string | null;
  postsPerPage: number;
  /** Where the index came from, for diagnostics. */
  source: "mds-endpoint" | "core-rest" | "unavailable";
}

export type Resolution =
  | { type: "entry"; entry: PathEntry }
  | { type: "redirect"; to: string }
  | { type: "not-found" };

/* ── Views ───────────────────────────────────────────────────────── */

export interface Breadcrumb {
  name: string;
  path: string;
}

export interface CallToAction {
  label: string;
  href: string;
}

export interface ServicePageModel {
  kind: "service";
  id: number;
  path: string;
  title: string;
  eyebrow: string;
  heroHeading: string;
  heroIntro: Inline[];
  heroImage: ImageAsset | null;
  shortDescription: string | null;
  benefits: { title: string; body: string; image?: ImageAsset | null }[];
  process: { title: string; body: ContentBlock[] }[];
  body: ContentBlock[];
  faqs: Faq[];
  relatedCaseStudies: CaseStudySummary[];
  industries: { name: string; path: string | null }[];
  cta: CallToAction;
  catalogueSlug: string | null;
  seo: SeoModel | null;
  /** "structured" = service CPT fields, "legacy" = parsed from the existing Elementor page. */
  source: "structured" | "legacy";
}

export interface LocationPageModel {
  kind: "location";
  id: number;
  path: string;
  title: string;
  city: string | null;
  heroHeading: string;
  intro: Inline[];
  servicesOffered: { name: string; path: string | null }[];
  localProof: ContentBlock[];
  body: ContentBlock[];
  faqs: Faq[];
  seo: SeoModel | null;
  source: "structured" | "legacy";
}

export interface GenericPageModel {
  kind: "page";
  id: number;
  path: string;
  title: string;
  body: ContentBlock[];
  seo: SeoModel | null;
}

export interface TermRef {
  id: number;
  slug: string;
  name: string;
  path: string;
}

export interface PostSummary {
  id: number;
  path: string;
  title: string;
  excerpt: string;
  date: string;
  modified: string | null;
  image: ImageAsset | null;
  categories: TermRef[];
}

export interface PostModel extends PostSummary {
  kind: "post";
  author: string | null;
  tags: TermRef[];
  body: ContentBlock[];
  seo: SeoModel | null;
}

export interface PostListPage {
  posts: PostSummary[];
  page: number;
  totalPages: number;
  total: number;
}

export interface ArchiveModel {
  kind: "blog-index" | "category" | "tag" | "author";
  title: string;
  label: string;
  basePath: string;
  list: PostListPage;
  seo: SeoModel | null;
}

export interface CaseStudyMetric {
  label: string;
  value: string;
  period: string | null;
  /** Required for a metric to count as verified proof. */
  source: string | null;
  verified: boolean;
}

export interface CaseStudySummary {
  id: number;
  path: string;
  title: string;
  clientName: string | null;
  industry: string | null;
}

export interface CaseStudyModel extends CaseStudySummary {
  kind: "case-study";
  challenge: ContentBlock[];
  strategy: ContentBlock[];
  execution: ContentBlock[];
  results: ContentBlock[];
  /** Only metrics with a source. Unsourced metrics are dropped, never shown as proof. */
  metrics: CaseStudyMetric[];
  gallery: ImageAsset[];
  testimonial: TestimonialModel | null;
  services: { name: string; path: string | null }[];
  date: string | null;
  seo: SeoModel | null;
}

export interface TestimonialModel {
  id: number;
  name: string;
  company: string | null;
  designation: string | null;
  photo: ImageAsset | null;
  review: string;
  rating: number | null;
  source: string | null;
  sourceUrl: string | null;
}

export interface PortfolioModel {
  id: number;
  path: string;
  projectName: string;
  category: string | null;
  gallery: ImageAsset[];
  technologies: string[];
  description: ContentBlock[];
  liveUrl: string | null;
}

export interface IndustryModel {
  kind: "industry";
  id: number;
  path: string;
  title: string;
  intro: ContentBlock[];
  painPoints: { title: string; body: string }[];
  services: { name: string; path: string | null }[];
  caseStudies: CaseStudySummary[];
  seo: SeoModel | null;
}

export interface SiteSettingsModel {
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  offices: { label: string; lines: string[] }[];
  socialLinks: { label: string; url: string }[];
  gtmId: string | null;
  metaPixelId: string | null;
  googleReviewUrl: string | null;
}
