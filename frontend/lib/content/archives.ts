import "server-only";
import type { ArchiveModel } from "@/types/content";
import {
  getAuthorArchive,
  getPathIndex,
  getTerm,
  getYoastHead,
  listPosts,
  pagedSeo,
} from "@/lib/wordpress";
import { absoluteUrl } from "@/lib/site";

export type ArchiveKind = "category" | "tag" | "author";

/** "page/2" segments → page number; null when the segments aren't a valid pager. */
export function parsePager(rest: string[] | undefined): number | null {
  if (!rest || rest.length === 0) return 1;
  if (rest.length === 2 && rest[0] === "page" && /^\d+$/.test(rest[1]))
    return Number(rest[1]);
  return null;
}

/** Category, tag or author archive page N, or null if it doesn't exist. */
export async function loadArchive(
  kind: ArchiveKind,
  slug: string,
  page: number
): Promise<ArchiveModel | null> {
  const index = await getPathIndex();
  const perPage = index.postsPerPage;
  const basePath = `/${kind}/${slug}/`;
  const pagedPath = page > 1 ? `${basePath}page/${page}/` : basePath;

  if (kind === "author") {
    const author = await getAuthorArchive(slug);
    if (!author) return null;
    const list = await listPosts({
      page,
      perPage,
      authorId: author.id ?? undefined,
    });
    if (!list.posts.length && page > 1) return null;
    const seo =
      page > 1
        ? ((await getYoastHead(pagedPath)) ??
          pagedSeo(author.seo, {
            canonical: absoluteUrl(pagedPath),
            page,
            totalPages: list.totalPages,
            insertPageInTitle: true,
          }))
        : author.seo;
    return {
      kind,
      title: `Posts by ${author.name}`,
      label: "Author",
      basePath,
      list,
      seo,
    };
  }

  const term = await getTerm(kind, slug);
  if (!term) return null;
  const list = await listPosts({
    page,
    perPage,
    ...(kind === "category" ? { categoryId: term.id } : { tagId: term.id }),
  });
  if (!list.posts.length && page > 1) return null;
  const seo =
    page > 1
      ? ((await getYoastHead(pagedPath)) ??
        pagedSeo(term.seo, {
          canonical: absoluteUrl(pagedPath),
          page,
          totalPages: list.totalPages,
          insertPageInTitle: true,
        }))
      : term.seo;
  return {
    kind,
    title: term.name,
    label: kind === "category" ? "Category" : "Topic",
    basePath,
    list,
    seo,
  };
}
