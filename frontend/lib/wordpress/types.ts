/**
 * RAW WordPress REST response shapes. Never import these outside
 * lib/wordpress/*. Components receive the normalized models in
 * types/content.ts instead.
 *
 * Core shapes (pages, posts, terms, media, yoast_head_json) are verified
 * against the live site. Structured post types (service, location_page,
 * case_study, testimonial, portfolio_project, industry) don't exist on the
 * live site yet. Their field names match the content model prepared in
 * wordpress/mu-plugins/mds-content-model.php, which is the contract.
 */

export interface WPRendered {
  rendered: string;
}

/* ── media ───────────────────────────────────────────────────────── */

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details?: {
    width?: number;
    height?: number;
    sizes?: Record<
      string,
      { source_url: string; width: number; height: number }
    >;
  };
}

/** An ACF/SCF image field: attachment ID, image array, or false when empty. */
export type WPImageField =
  | number
  | false
  | null
  | {
      ID?: number;
      id?: number;
      url: string;
      alt?: string;
      width?: number;
      height?: number;
    };

/* ── Yoast ───────────────────────────────────────────────────────── */

export interface WPSeoMeta {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: {
    index?: string;
    follow?: string;
    "max-snippet"?: string;
    "max-image-preview"?: string;
    "max-video-preview"?: string;
  };
  og_type?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_image?: { url: string; width?: number; height?: number; type?: string }[];
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_misc?: Record<string, string>;
  article_published_time?: string;
  article_modified_time?: string;
}

/** yoast/v1/get_head?url=… */
export interface WPYoastHead {
  status: number;
  json?: WPSeoMeta;
}

/* ── core objects ────────────────────────────────────────────────── */

export interface WPObject {
  id: number;
  slug: string;
  status?: string;
  type?: string;
  link: string;
  date?: string;
  modified?: string;
  title: WPRendered;
  content?: WPRendered;
  excerpt?: WPRendered;
  featured_media?: number;
  yoast_head_json?: WPSeoMeta;
  _embedded?: {
    "wp:featuredmedia"?: WPMedia[];
    author?: { id: number; name: string; slug?: string }[];
    "wp:term"?: WPTerm[][];
  };
}

export interface WPPage extends WPObject {
  parent?: number;
  template?: string;
}

export interface WPPost extends WPObject {
  categories?: number[];
  tags?: number[];
  author?: number;
}

export interface WPTerm {
  id: number;
  slug: string;
  name: string;
  count?: number;
  link: string;
  taxonomy?: string;
  description?: string;
  yoast_head_json?: WPSeoMeta;
}

/* ── structured post types (contract: mds-content-model.php) ─────── */

type Rel =
  | number
  | { ID?: number; id?: number; post_title?: string; post_name?: string };

export interface WPPathFields {
  public_path?: string;
  previous_paths?: { path: string }[] | string | false | null;
}

export interface WPService extends WPObject {
  acf?: WPPathFields & {
    hero?: { headline?: string; intro?: string; image?: WPImageField } | false;
    short_description?: string;
    long_description?: string;
    benefits?: { title: string; body: string; image?: WPImageField }[] | false;
    process?: { title: string; body: string }[] | false;
    faqs?: { question: string; answer: string }[] | false;
    related_case_studies?: Rel[] | false;
    industries?: Rel[] | false;
    cta?: { label?: string; url?: string } | false;
    catalogue_slug?: string;
  };
}

export interface WPLocationPage extends WPObject {
  acf?: WPPathFields & {
    city?: string;
    intro?: string;
    services_offered?: Rel[] | false;
    local_proof?: string;
    faqs?: { question: string; answer: string }[] | false;
  };
}

export interface WPCaseStudy extends WPObject {
  acf?: WPPathFields & {
    client_name?: string;
    industry?: Rel | Rel[] | false;
    challenge?: string;
    strategy?: string;
    execution?: string;
    results?: string;
    metrics?:
      | { label: string; value: string; period?: string; source?: string }[]
      | false;
    gallery?: WPImageField[] | false;
    testimonial?: Rel | false;
    services?: Rel[] | false;
  };
}

export interface WPTestimonial extends WPObject {
  acf?: {
    name?: string;
    company?: string;
    designation?: string;
    photo?: WPImageField;
    review?: string;
    rating?: number | string;
    source?: string;
    source_url?: string;
  };
}

export interface WPPortfolioProject extends WPObject {
  acf?: WPPathFields & {
    project_name?: string;
    category?: string;
    gallery?: WPImageField[] | false;
    technologies?: string | string[];
    description?: string;
    live_url?: string;
  };
}

export interface WPIndustry extends WPObject {
  acf?: WPPathFields & {
    intro?: string;
    pain_points?: { title: string; body: string }[] | false;
    services?: Rel[] | false;
    case_studies?: Rel[] | false;
  };
}

/* ── mu-plugin endpoints (contract: mds-headless.php) ────────────── */

export interface WPPathIndexItem {
  path: string;
  type: string;
  kind?: string;
  id: number;
  slug: string;
  title: string;
  modified?: string;
  previous_paths?: string[];
  catalogue_slug?: string;
  noindex?: boolean;
}

export interface WPPathIndexResponse {
  generated?: string;
  posts_per_page?: number;
  blog_index_path?: string | null;
  front_page_id?: number;
  items: WPPathIndexItem[];
}

export interface WPSiteSettings {
  phone?: string;
  whatsapp_number?: string;
  email?: string;
  offices?: { label: string; address: string }[] | false;
  social_links?: { label: string; url: string }[] | false;
  gtm_id?: string;
  meta_pixel_id?: string;
  google_review_url?: string;
}

export type { Rel as WPRelation };
