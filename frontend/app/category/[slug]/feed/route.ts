import { getTerm, listPosts } from "@/lib/wordpress";
import { rssResponse } from "@/lib/content/rss";

/** /category/<slug>/feed/ — per-category RSS, as WordPress served it. */
export const revalidate = 3600;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/category/[slug]/feed">
) {
  const { slug } = await ctx.params;
  const term = await getTerm("category", slug);
  if (!term) return new Response("Not found", { status: 404 });
  const { posts } = await listPosts({ perPage: 20, categoryId: term.id });
  return rssResponse({
    title: `${term.name} — My Digital Savvy`,
    selfPath: `/category/${term.slug}/feed/`,
    description: `Posts in ${term.name}`,
    posts,
  });
}
