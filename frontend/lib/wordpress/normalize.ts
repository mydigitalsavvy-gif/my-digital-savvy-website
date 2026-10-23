import "server-only";
import type { ImageAsset, SeoModel, SeoRobots, TermRef } from "@/types/content";
import {
  normalizePath,
  toInternalPath,
  toPublicUrl,
  withTrailingSlash,
} from "@/lib/site";
import { wpFetch } from "./client";
import { TAG, TTL } from "./cache";
import { htmlToText } from "./html-blocks";
import type {
  WPImageField,
  WPMedia,
  WPObject,
  WPRelation,
  WPSeoMeta,
  WPTerm,
} from "./types";

/** REST bases for structured post types. Must match mds-content-model.php. */
export const REST_BASE: Record<string, string> = {
  page: "pages",
  post: "posts",
  service: "services",
  location_page: "location-pages",
  case_study: "case-studies",
  testimonial: "testimonials",
  portfolio_project: "portfolio",
  industry: "industries",
};

export function title(obj: Pick<WPObject, "title">): string {
  return htmlToText(obj.title?.rendered);
}

/** WordPress permalink → site path ("/seo-agency-in-nagpur/"). */
export function pathFromLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const internal = toInternalPath(link);
  if (internal === null) return null;
  return withTrailingSlash(internal.split("?")[0].split("#")[0]);
}

export function previousPaths(
  raw: { path: string }[] | string | false | null | undefined
): string[] {
  if (!raw) return [];
  const list =
    typeof raw === "string" ? raw.split(/[\n,]+/) : raw.map((r) => r.path);
  return list
    .map((p) => p?.trim())
    .filter(Boolean)
    .map((p) => normalizePath(pathFromLink(p) ?? p));
}

export function relIds(
  raw: WPRelation | WPRelation[] | false | null | undefined
): number[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((r) => (typeof r === "number" ? r : (r.ID ?? r.id ?? 0)))
    .filter((n): n is number => typeof n === "number" && n > 0);
}

/* ── media ───────────────────────────────────────────────────────── */

export function imageFromMedia(
  media: WPMedia | null | undefined
): ImageAsset | null {
  if (!media?.source_url) return null;
  return {
    url: media.source_url,
    alt: media.alt_text || "",
    width: media.media_details?.width ?? null,
    height: media.media_details?.height ?? null,
  };
}

export function featuredImage(obj: WPObject): ImageAsset | null {
  return imageFromMedia(obj._embedded?.["wp:featuredmedia"]?.[0]);
}

export async function getMediaImage(id: number): Promise<ImageAsset | null> {
  if (!id) return null;
  const media = await wpFetch<WPMedia>(`wp/v2/media/${id}`, {
    searchParams: { _fields: "id,source_url,alt_text,media_details" },
    revalidate: TTL.page,
    tags: [`media:${id}`],
  });
  return imageFromMedia(media);
}

/** ACF/SCF image field in any return format → ImageAsset (fetches by ID if needed). */
export async function imageField(
  field: WPImageField | undefined
): Promise<ImageAsset | null> {
  if (!field) return null;
  if (typeof field === "number") return getMediaImage(field);
  if (!field.url) return null;
  return {
    url: field.url,
    alt: field.alt ?? "",
    width: field.width ?? null,
    height: field.height ?? null,
  };
}

/* ── terms ───────────────────────────────────────────────────────── */

export function termRef(t: WPTerm): TermRef {
  return {
    id: t.id,
    slug: t.slug,
    name: htmlToText(t.name),
    path:
      pathFromLink(t.link) ??
      `/${t.taxonomy === "post_tag" ? "tag" : "category"}/${t.slug}/`,
  };
}

export function embeddedTerms(
  obj: WPObject,
  taxonomy: "category" | "post_tag"
): TermRef[] {
  const groups = obj._embedded?.["wp:term"] ?? [];
  return groups
    .flat()
    .filter((t) => t && (t.taxonomy ?? "category") === taxonomy)
    .map(termRef);
}

/* ── Yoast → SeoModel ────────────────────────────────────────────── */

function robots(r: WPSeoMeta["robots"]): SeoRobots | null {
  if (!r) return null;
  const num = (v?: string) => {
    const m = v?.match(/:(-?\d+)/);
    return m ? Number(m[1]) : null;
  };
  const preview = r["max-image-preview"]?.split(":")[1];
  return {
    index: r.index !== "noindex",
    follow: r.follow !== "nofollow",
    maxSnippet: num(r["max-snippet"]),
    maxImagePreview:
      preview === "none" || preview === "standard" || preview === "large"
        ? preview
        : null,
    maxVideoPreview: num(r["max-video-preview"]),
  };
}

export function normalizeSeo(
  seo: WPSeoMeta | null | undefined
): SeoModel | null {
  if (!seo) return null;
  const img = seo.og_image?.[0];
  return {
    title: seo.title ? htmlToText(seo.title) : null,
    description: seo.description ? htmlToText(seo.description) : null,
    canonical: toPublicUrl(seo.canonical ?? seo.og_url ?? null),
    robots: robots(seo.robots),
    ogType: seo.og_type ?? null,
    ogTitle: seo.og_title ? htmlToText(seo.og_title) : null,
    ogDescription: seo.og_description ? htmlToText(seo.og_description) : null,
    ogImage: img?.url
      ? {
          url: img.url,
          alt: "",
          width: img.width ?? null,
          height: img.height ?? null,
        }
      : null,
    twitterCard:
      seo.twitter_card === "summary" ||
      seo.twitter_card === "summary_large_image"
        ? seo.twitter_card
        : null,
    twitterTitle: seo.twitter_title ? htmlToText(seo.twitter_title) : null,
    twitterDescription: seo.twitter_description
      ? htmlToText(seo.twitter_description)
      : null,
    twitterMisc:
      seo.twitter_misc && typeof seo.twitter_misc === "object"
        ? Object.fromEntries(
            Object.entries(seo.twitter_misc).map(([k, v]) => [
              htmlToText(k),
              htmlToText(String(v)),
            ])
          )
        : null,
    publishedTime: seo.article_published_time ?? null,
    modifiedTime: seo.article_modified_time ?? null,
  };
}

export const SEO_TAG = TAG.seo;
