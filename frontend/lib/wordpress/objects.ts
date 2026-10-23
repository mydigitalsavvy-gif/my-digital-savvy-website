import "server-only";
import { wpFetch, wpFetchList } from "./client";
import { TAG, TTL, tagFor, type TagName } from "./cache";
import { REST_BASE } from "./normalize";
import type { WPObject } from "./types";

export interface ReadOptions {
  /** Draft Mode read: authenticated, uncached, latest autosave applied. */
  draft?: boolean;
}

const TAG_BY_TYPE: Record<string, TagName> = {
  page: TAG.page,
  post: TAG.post,
  service: TAG.service,
  location_page: TAG.location,
  case_study: TAG.caseStudy,
  testimonial: TAG.testimonial,
  portfolio_project: TAG.portfolio,
  industry: TAG.industry,
};

const TTL_BY_TYPE: Record<string, number> = {
  page: TTL.page,
  post: TTL.post,
  service: TTL.service,
  location_page: TTL.location,
  case_study: TTL.caseStudy,
  testimonial: TTL.testimonial,
  portfolio_project: TTL.portfolio,
  industry: TTL.industry,
};

export function cacheOptions(type: string, keys: (string | number)[] = []) {
  const tag = TAG_BY_TYPE[type] ?? TAG.page;
  return {
    revalidate: TTL_BY_TYPE[type] ?? TTL.page,
    tags: [tag, ...keys.map((k) => tagFor(tag, k))],
  };
}

/**
 * One WordPress object by type + ID, with embeds (featured media, terms,
 * author). In draft mode the newest autosave's title/content/excerpt are
 * laid over the saved version, which is exactly what WordPress's own
 * Preview button shows for a published post with unsaved edits.
 */
export async function getObject<T extends WPObject>(
  type: string,
  id: number,
  { draft = false }: ReadOptions = {}
): Promise<T | null> {
  const base = REST_BASE[type];
  if (!base) return null;
  const opts = draft ? { draft: true } : cacheOptions(type, [id]);
  const obj = await wpFetch<T>(`wp/v2/${base}/${id}`, {
    ...opts,
    searchParams: { _embed: 1 },
  });
  if (!obj || !draft) return obj;

  const autosaves = await wpFetchList<WPObject>(
    `wp/v2/${base}/${id}/autosaves`,
    { draft: true }
  );
  const latest = autosaves[0];
  if (latest && (!obj.modified || (latest.modified ?? "") > obj.modified)) {
    return {
      ...obj,
      title: latest.title ?? obj.title,
      content: latest.content ?? obj.content,
      excerpt: latest.excerpt ?? obj.excerpt,
    };
  }
  return obj;
}

/** Several objects of one type by ID, in the requested order. */
export async function getObjects<T extends WPObject>(
  type: string,
  ids: number[],
  opts: ReadOptions = {}
): Promise<T[]> {
  if (!ids.length || !REST_BASE[type]) return [];
  const list = await wpFetchList<T>(`wp/v2/${REST_BASE[type]}`, {
    ...(opts.draft ? { draft: true } : cacheOptions(type)),
    searchParams: {
      include: ids.join(","),
      per_page: Math.min(ids.length, 100),
      _embed: 1,
    },
  });
  const byId = new Map(list.map((o) => [o.id, o]));
  return ids.map((id) => byId.get(id)).filter((o): o is T => Boolean(o));
}

/** Every published object of a structured type ([] while the type isn't registered). */
export async function listObjects<T extends WPObject>(
  type: string,
  searchParams: Record<string, string | number> = {}
): Promise<T[]> {
  if (!REST_BASE[type]) return [];
  return wpFetchList<T>(`wp/v2/${REST_BASE[type]}`, {
    ...cacheOptions(type),
    // No orderby default: an orderby a post type doesn't support answers 400.
    searchParams: { per_page: 100, _embed: 1, ...searchParams },
  });
}
