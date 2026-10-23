import "server-only";
import type {
  PathEntry,
  PostListPage,
  PostModel,
  PostSummary,
} from "@/types/content";
import { wpFetchAll, wpFetchPaged } from "./client";
import { TAG, TTL, tagFor } from "./cache";
import { htmlToBlocks, htmlToText } from "./html-blocks";
import { getObject, type ReadOptions } from "./objects";
import {
  embeddedTerms,
  featuredImage,
  normalizeSeo,
  pathFromLink,
  title,
} from "./normalize";
import type { WPPost } from "./types";

/** Fields a post card needs. Content is excluded: 21 full posts with embeds exceed the 2 MB cache limit. */
const SUMMARY_FIELDS =
  "id,slug,link,title,excerpt,date,modified,featured_media,categories,_links,_embedded";
const SUMMARY_EMBED = "wp:featuredmedia,wp:term";

export function postSummary(p: WPPost): PostSummary {
  return {
    id: p.id,
    path: pathFromLink(p.link) ?? `/${p.slug}/`,
    title: title(p),
    excerpt: htmlToText(p.excerpt?.rendered).replace(
      /\s*\[(…|&hellip;|\.\.\.)\]\s*$/,
      "…"
    ),
    date: p.date ?? "",
    modified: p.modified ?? null,
    image: featuredImage(p),
    categories: embeddedTerms(p, "category"),
  };
}

export async function getPost(
  entry: PathEntry,
  opts: ReadOptions = {}
): Promise<PostModel | null> {
  const p = await getObject<WPPost>("post", entry.id, opts);
  if (!p) return null;
  const author = p._embedded?.author?.[0];
  return {
    kind: "post",
    ...postSummary(p),
    path: entry.path,
    author: author && "name" in author && author.name ? author.name : null,
    tags: embeddedTerms(p, "post_tag"),
    body: htmlToBlocks(p.content?.rendered).blocks,
    seo: normalizeSeo(p.yoast_head_json),
  };
}

export interface PostQuery {
  page?: number;
  perPage: number;
  categoryId?: number;
  tagId?: number;
  authorId?: number;
}

/** One archive page. An out-of-range page returns no posts (route → 404). */
export async function listPosts(q: PostQuery): Promise<PostListPage> {
  const page = Math.max(1, q.page ?? 1);
  const tags: string[] = [TAG.post];
  if (q.categoryId) tags.push(tagFor(TAG.category, q.categoryId));
  if (q.tagId) tags.push(tagFor(TAG.tag, q.tagId));
  const res = await wpFetchPaged<WPPost>("wp/v2/posts", {
    revalidate: TTL.post,
    tags,
    searchParams: {
      _embed: SUMMARY_EMBED,
      _fields: SUMMARY_FIELDS,
      page,
      per_page: q.perPage,
      categories: q.categoryId,
      tags: q.tagId,
      author: q.authorId,
    },
  });
  return {
    posts: res.items.map(postSummary),
    page,
    totalPages: res.totalPages,
    total: res.total,
  };
}

/** Every post (feed, sitemap). */
export async function allPosts(): Promise<PostSummary[]> {
  const items = await wpFetchAll<WPPost>("wp/v2/posts", {
    revalidate: TTL.post,
    tags: [TAG.post],
    searchParams: { _embed: SUMMARY_EMBED, _fields: SUMMARY_FIELDS },
  });
  return items.map(postSummary);
}
