import type { MetadataRoute } from "next";
import { getPathIndex, listTerms } from "@/lib/wordpress";
import { absoluteUrl } from "@/lib/site";

/**
 * Mirrors what the Yoast sitemaps listed (pages, posts, categories, tags,
 * author) plus the new Next.js routes, so Search Console sees the same URL
 * set after cutover. Noindexed and redirected URLs are excluded. Falls
 * back to the static routes if WordPress is unreachable.
 */
export const revalidate = 3600;

const STATIC: MetadataRoute.Sitemap = [
  { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
  { url: absoluteUrl("/services/"), changeFrequency: "monthly", priority: 0.8 },
  { url: absoluteUrl("/about/"), changeFrequency: "monthly", priority: 0.6 },
  { url: absoluteUrl("/contact/"), changeFrequency: "yearly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const index = await getPathIndex();
    const entries: MetadataRoute.Sitemap = index.entries
      .filter((e) => e.kind !== "front-page" && !e.noindex)
      .map((e) => ({
        url: absoluteUrl(e.path),
        lastModified: e.modified ?? undefined,
        changeFrequency: e.kind === "post" ? "monthly" : "weekly",
        priority:
          e.kind === "service" || e.kind === "location"
            ? 0.9
            : e.kind === "post"
              ? 0.6
              : 0.7,
      }));
    const [categories, tags] = await Promise.all([
      listTerms("category"),
      listTerms("tag"),
    ]);
    const terms: MetadataRoute.Sitemap = [...categories, ...tags]
      .filter((t) => t.count > 0)
      .map((t) => ({
        url: absoluteUrl(t.path),
        changeFrequency: "weekly",
        priority: 0.4,
      }));
    const author: MetadataRoute.Sitemap = index.entries.some(
      (e) => e.kind === "post"
    )
      ? [
          {
            url: absoluteUrl("/author/mydigitalsavvy/"),
            changeFrequency: "weekly",
            priority: 0.3,
          },
        ]
      : [];
    return [...STATIC, ...entries, ...terms, ...author];
  } catch (error) {
    console.error(
      "[sitemap] WordPress unavailable, serving static routes only:",
      error
    );
    return STATIC;
  }
}
