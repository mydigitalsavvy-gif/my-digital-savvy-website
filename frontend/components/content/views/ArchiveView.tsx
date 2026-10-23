import type { ArchiveModel } from "@/types/content";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero, Pager, PostList } from "../PageParts";

/** Blog index, category, tag and author archives: one editorial list design. */
export function ArchiveView({
  model,
  blogPath,
}: {
  model: ArchiveModel;
  blogPath: string;
}) {
  const crumbs =
    model.kind === "blog-index"
      ? [
          { name: "Home", path: "/" },
          { name: model.title, path: model.basePath },
        ]
      : [
          { name: "Home", path: "/" },
          { name: "Blog", path: blogPath },
          { name: model.title, path: model.basePath },
        ];
  if (model.list.page > 1)
    crumbs.push({
      name: `Page ${model.list.page}`,
      path: `${model.basePath}page/${model.list.page}/`,
    });

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) }))
        )}
      />
      <main>
        <PageHero crumbs={crumbs} eyebrow={model.label} heading={model.title} />
        <section className="wrap cx-section" aria-label="Posts">
          {model.list.posts.length ? (
            <PostList posts={model.list.posts} />
          ) : (
            <p className="hero-sub">No posts published yet.</p>
          )}
          <Pager
            basePath={model.basePath}
            page={model.list.page}
            totalPages={model.list.totalPages}
          />
        </section>
      </main>
    </>
  );
}
