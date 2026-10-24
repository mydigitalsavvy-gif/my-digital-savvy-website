import { notFound, permanentRedirect } from "next/navigation";
import { getPathIndex } from "@/lib/wordpress";

/**
 * /blog/ is a convenience alias for page 1 only (see app/blog/page.tsx,
 * which already canonicalises to the WordPress posts page). Page 2+ has
 * always lived at that canonical URL — /my-digital-savvy-blog/page/N/,
 * served by app/[slug]/page/[page]/page.tsx — not under /blog/ itself.
 *
 * Without this route, a visitor or crawler who edits the URL bar from
 * /blog/ to /blog/page/2/ (a reasonable guess once /blog/ exists) hit a
 * 404 instead of their content. This redirects them to the real,
 * already-working URL rather than duplicating its rendering/validation
 * logic — an out-of-range page still 404s correctly there.
 */
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

export default async function BlogPagedRedirect(
  props: PageProps<"/blog/page/[page]">
) {
  const { page } = await props.params;
  if (!/^\d+$/.test(page)) notFound();

  const index = await getPathIndex().catch(() => null);
  const basePath =
    index?.entries.find((e) => e.kind === "blog-index")?.path ??
    "/my-digital-savvy-blog/";

  permanentRedirect(Number(page) <= 1 ? basePath : `${basePath}page/${page}/`);
}
