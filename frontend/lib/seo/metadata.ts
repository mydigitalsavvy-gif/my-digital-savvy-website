import type { Metadata } from "next";
import type { ImageAsset, SeoModel } from "@/types/content";
import { absoluteUrl } from "@/lib/site";

interface Fallback {
  /** Site path of this page; used for the canonical when Yoast has none. */
  path: string;
  title: string;
  description?: string | null;
  image?: ImageAsset | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  /** Force noindex regardless of Yoast (previews, paginated duplicates, …). */
  noindex?: boolean;
  /** The WordPress front page renders no twitter:label/data pairs. */
  omitTwitterMisc?: boolean;
}

/**
 * Yoast → Next.js Metadata. Yoast is authoritative: every field it
 * provides is used as-is (titles are absolute, so the layout's
 * "%s — My Digital Savvy" template is NOT appended to them). Fallbacks
 * only fill fields Yoast leaves empty. Nothing is invented.
 */
export function buildMetadata(seo: SeoModel | null, fb: Fallback): Metadata {
  const title = seo?.title || fb.title;
  // A Yoast object with an empty description stays empty (as on the live
  // site); the fallback only applies when there is no Yoast data at all.
  const description = seo
    ? seo.description || undefined
    : fb.description || undefined;
  const canonical = seo?.canonical || absoluteUrl(fb.path);
  const image = seo?.ogImage ?? fb.image ?? null;
  const ogType =
    (seo?.ogType === "article" || fb.type === "article") &&
    fb.type !== "website"
      ? "article"
      : "website";
  const r = seo?.robots;
  const index = fb.noindex ? false : (r?.index ?? true);
  const follow = r?.follow ?? true;

  const images = image
    ? [
        {
          url: image.url,
          width: image.width ?? undefined,
          height: image.height ?? undefined,
          alt: image.alt || undefined,
        },
      ]
    : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: {
      index,
      follow,
      ...(index
        ? {
            googleBot: {
              index,
              follow,
              ...(r?.maxSnippet !== null && r?.maxSnippet !== undefined
                ? { "max-snippet": r.maxSnippet }
                : {}),
              ...(r?.maxImagePreview
                ? { "max-image-preview": r.maxImagePreview }
                : {}),
              ...(r?.maxVideoPreview !== null &&
              r?.maxVideoPreview !== undefined
                ? { "max-video-preview": r.maxVideoPreview }
                : {}),
            },
          }
        : {}),
    },
    openGraph: {
      type: ogType,
      url: canonical,
      siteName: "My Digital Savvy",
      locale: "en_US",
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      images,
      ...(ogType === "article"
        ? {
            publishedTime: seo?.publishedTime ?? fb.publishedTime ?? undefined,
            modifiedTime: seo?.modifiedTime ?? fb.modifiedTime ?? undefined,
          }
        : {}),
    },
    // Yoast emits only the Twitter fields an editor set (normally just the
    // card) and lets Twitter fall back to Open Graph. Next.js always fills
    // twitter:title/description/image from Open Graph (no opt-out), so those
    // three tags appear with values identical to og:* — equivalent output,
    // documented in docs/phase-7/metadata-parity.md.
    twitter: seo
      ? {
          card: seo.twitterCard ?? "summary_large_image",
          ...(seo.twitterTitle ? { title: seo.twitterTitle } : {}),
          ...(seo.twitterDescription
            ? { description: seo.twitterDescription }
            : {}),
        }
      : {
          card: image ? "summary_large_image" : "summary",
          title,
          description,
          images: image ? [image.url] : undefined,
        },
    other: seo ? yoastTwitterTags(seo, fb.omitTwitterMisc) : {},
  };
}

/** Yoast "Written by" / "Est. reading time" twitter:label/data pairs. */
function yoastTwitterTags(
  seo: SeoModel,
  omitMisc = false
): Record<string, string> {
  const tags: Record<string, string> = {};
  if (omitMisc) return tags;
  Object.entries(seo.twitterMisc ?? {}).forEach(([label, data], i) => {
    tags[`twitter:label${i + 1}`] = label;
    tags[`twitter:data${i + 1}`] = data;
  });
  return tags;
}
