import "server-only";
import type { SeoModel, TermRef } from "@/types/content";
import { wpFetchAll, wpFetchList } from "./client";
import { TAG, TTL, tagFor } from "./cache";
import { normalizeSeo, termRef } from "./normalize";
import { getYoastHead } from "./seo";
import type { WPTerm } from "./types";

export type TaxonomyKind = "category" | "tag";

const BASE: Record<TaxonomyKind, string> = {
  category: "categories",
  tag: "tags",
};

export interface TermModel extends TermRef {
  count: number;
  seo: SeoModel | null;
}

export async function getTerm(
  kind: TaxonomyKind,
  slug: string
): Promise<TermModel | null> {
  const tag = kind === "category" ? TAG.category : TAG.tag;
  const [term] = await wpFetchList<WPTerm>(`wp/v2/${BASE[kind]}`, {
    revalidate: TTL.taxonomy,
    tags: [tag, tagFor(tag, slug)],
    searchParams: { slug },
  });
  if (!term) return null;
  return {
    ...termRef({ ...term, taxonomy: kind === "tag" ? "post_tag" : "category" }),
    count: term.count ?? 0,
    seo: normalizeSeo(term.yoast_head_json),
  };
}

/** Terms with at least one post (sitemap). */
export async function listTerms(kind: TaxonomyKind): Promise<TermModel[]> {
  const terms = await wpFetchAll<WPTerm>(`wp/v2/${BASE[kind]}`, {
    revalidate: TTL.taxonomy,
    tags: [kind === "category" ? TAG.category : TAG.tag],
    searchParams: {
      hide_empty: "true",
      _fields: "id,slug,name,count,link,taxonomy",
    },
  });
  return terms.map((t) => ({
    ...termRef({ ...t, taxonomy: kind === "tag" ? "post_tag" : "category" }),
    count: t.count ?? 0,
    seo: null,
  }));
}

/**
 * Author archive. The live REST users endpoint is locked down (returns
 * nothing to anonymous requests), so the archive is confirmed through
 * Yoast instead: if WordPress serves /author/<slug>/, Yoast returns 200.
 * The site has one author, so the archive lists every post.
 */
export async function getAuthorArchive(
  slug: string
): Promise<{ id: number | null; name: string; seo: SeoModel | null } | null> {
  const users = await wpFetchList<{ id: number; name: string; slug: string }>(
    "wp/v2/users",
    {
      revalidate: TTL.taxonomy,
      tags: [TAG.post],
      searchParams: { slug },
    }
  );
  const path = `/author/${slug}/`;
  const seo = await getYoastHead(path);
  if (users[0]) return { id: users[0].id, name: users[0].name, seo };
  if (!seo) return null;
  return { id: null, name: slug, seo };
}
