import type { Metadata } from "next";
import { blogArchive } from "@/lib/content/entries";
import { getPathIndex } from "@/lib/wordpress";
import { buildMetadata } from "@/lib/seo/metadata";
import { ArchiveView } from "@/components/content/views/ArchiveView";

/**
 * /blog/ is a new, convenient URL. The established blog index is the
 * WordPress posts page (/my-digital-savvy-blog/), which keeps its URL and
 * rankings, so this page canonicalises to it instead of competing with it.
 */
export const revalidate = 3600;

async function load() {
  const index = await getPathIndex().catch(() => null);
  const entry = index?.entries.find((e) => e.kind === "blog-index") ?? null;
  const model = await blogArchive(entry, 1).catch(() => null);
  return { entry, model };
}

export async function generateMetadata(): Promise<Metadata> {
  const { entry, model } = await load();
  const meta = buildMetadata(model?.seo ?? null, {
    path: entry?.path ?? "/blog/",
    title: "Blog",
    description: "Marketing notes from My Digital Savvy, Nagpur.",
  });
  return meta;
}

export default async function BlogPage() {
  const { entry, model } = await load();
  if (!model) {
    return (
      <main className="wrap cx-section">
        <p className="hero-sub">The blog is temporarily unavailable.</p>
      </main>
    );
  }
  return (
    <ArchiveView
      model={{ ...model, basePath: entry?.path ?? "/blog/" }}
      blogPath={entry?.path ?? "/blog/"}
    />
  );
}
