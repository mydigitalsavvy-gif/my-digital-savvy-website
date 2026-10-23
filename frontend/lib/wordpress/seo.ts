import "server-only";
import type { SeoModel } from "@/types/content";
import { withTrailingSlash } from "@/lib/site";
import { wordpressOrigin, wpFetch } from "./client";
import { TAG, TTL, tagFor } from "./cache";
import { normalizeSeo } from "./normalize";
import type { WPYoastHead } from "./types";

/**
 * Yoast for page N of an archive. Yoast's get_head can't resolve paged
 * URLs, so this reproduces what WordPress serves: page 1's data with a
 * self-referencing canonical, and for term/author archives the
 * "- Page N of M" segment Yoast inserts before the site name.
 */
export function pagedSeo(
  first: SeoModel | null,
  opts: {
    canonical: string;
    page: number;
    totalPages: number;
    insertPageInTitle: boolean;
  }
): SeoModel | null {
  if (!first) return null;
  const addPage = (t: string | null) => {
    if (!t || !opts.insertPageInTitle) return t;
    const marker = " - My digital Savvy";
    const seg = ` - Page ${opts.page} of ${opts.totalPages}`;
    return t.endsWith(marker)
      ? t.slice(0, -marker.length) + seg + marker
      : t + seg;
  };
  return {
    ...first,
    canonical: opts.canonical,
    title: addPage(first.title),
    ogTitle: addPage(first.ogTitle),
  };
}

/**
 * Yoast head for any WordPress URL (archives, the author page) via Yoast's
 * own yoast/v1/get_head endpoint. Objects with a REST resource (pages,
 * posts, terms) use their embedded yoast_head_json instead. Returns null
 * when WordPress doesn't serve the URL.
 */
export async function getYoastHead(path: string): Promise<SeoModel | null> {
  const origin = wordpressOrigin();
  if (!origin) return null;
  const res = await wpFetch<WPYoastHead>("yoast/v1/get_head", {
    revalidate: TTL.seo,
    tags: [TAG.seo, tagFor(TAG.seo, withTrailingSlash(path))],
    searchParams: { url: `${origin}${withTrailingSlash(path)}` },
  });
  if (!res || res.status !== 200 || !res.json) return null;
  return normalizeSeo(res.json);
}
