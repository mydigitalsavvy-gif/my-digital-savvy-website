import Link from "next/link";
import type { PostModel } from "@/types/content";
import { getHomeContent } from "@/lib/content/home";
import { absoluteUrl } from "@/lib/site";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { AuditCTA } from "@/components/sections/AuditCTA";
import { Blocks, ContentImage } from "../Blocks";
import { Breadcrumbs, formatDate } from "../PageParts";

export async function PostView({
  model,
  blogPath,
}: {
  model: PostModel;
  blogPath: string;
}) {
  const home = await getHomeContent();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: blogPath },
    { name: model.title, path: model.path },
  ];
  const category =
    model.categories.find((c) => c.slug !== "blog") ?? model.categories[0];

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) }))
        )}
      />
      <JsonLd
        data={buildArticleSchema({
          title: model.title,
          description: model.seo?.description || model.excerpt,
          url: absoluteUrl(model.path),
          datePublished: model.date,
          dateModified: model.modified ?? undefined,
          authorName: model.author ?? undefined,
          imageUrl: model.image?.url,
        })}
      />
      <main>
        <article>
          <div className="cx-hero wrap">
            <Breadcrumbs items={crumbs} />
            <div className="eyebrow">
              <span className="pip" aria-hidden="true"></span>
              <span className="label">
                <time dateTime={model.date}>{formatDate(model.date)}</time>
                {category ? ` · ${category.name}` : ""}
              </span>
            </div>
            <h1 className="display">{model.title}</h1>
            {model.image ? (
              <div className="cx-hero-image">
                <ContentImage image={model.image} sizes="100vw" priority />
              </div>
            ) : null}
          </div>
          <div className="wrap cx-section">
            <Blocks blocks={model.body} />
            {model.tags.length ? (
              <div className="cx-terms">
                {model.tags.map((t) => (
                  <Link key={t.id} href={t.path}>
                    {t.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </article>
        <AuditCTA
          audit={{
            ...home.audit,
            cta: { ...home.audit.cta, href: "/#contact" },
          }}
        />
      </main>
    </>
  );
}
