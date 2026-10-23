import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type {
  Breadcrumb,
  Faq,
  ImageAsset,
  Inline,
  PostSummary,
} from "@/types/content";
import { Blocks, ContentImage, Inlines } from "./Blocks";

export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="cx-crumbs label">
        {items.map((c, i) =>
          i === items.length - 1 ? (
            <li key={c.path} aria-current="page">
              {c.name}
            </li>
          ) : (
            <li key={c.path}>
              <Link href={c.path}>{c.name}</Link>
            </li>
          )
        )}
      </ol>
    </nav>
  );
}

/** Page hero in the homepage's vocabulary: eyebrow pip, display H1, sub, pill CTAs. */
export function PageHero({
  crumbs,
  eyebrow,
  heading,
  intro,
  children,
  image,
}: {
  crumbs: Breadcrumb[];
  eyebrow: string;
  heading: string;
  intro?: Inline[] | string | null;
  children?: ReactNode;
  image?: ImageAsset | null;
}) {
  return (
    <section className="cx-hero wrap">
      <Breadcrumbs items={crumbs} />
      <div className="eyebrow">
        <span className="pip" aria-hidden="true"></span>
        <span className="label">{eyebrow}</span>
      </div>
      <h1 className="display">{heading}</h1>
      {intro && (typeof intro === "string" ? intro : intro.length) ? (
        <p className="hero-sub">
          {typeof intro === "string" ? intro : <Inlines items={intro} />}
        </p>
      ) : null}
      {children}
      {image ? (
        <div className="cx-hero-image">
          <ContentImage image={image} sizes="100vw" priority />
        </div>
      ) : null}
    </section>
  );
}

export function SectionHead({
  title,
  label,
  id,
}: {
  title: string;
  label?: string;
  id?: string;
}) {
  return (
    <div className="head">
      <h2 id={id}>{title}</h2>
      {label ? <span className="label">{label}</span> : null}
    </div>
  );
}

export function Faqs({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <section className="wrap cx-section" aria-labelledby="faq-heading">
      <SectionHead title="Questions" label="FAQ" id="faq-heading" />
      <div className="cx-faqs">
        {faqs.map((f, i) => (
          <details className="cx-faq" key={i}>
            <summary>{f.question}</summary>
            <Blocks blocks={f.answer} />
          </details>
        ))}
      </div>
    </section>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

export function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="cx-posts">
      {posts.map((p, i) => (
        <li className="cx-post" key={p.id}>
          <div>
            <div className="cx-post-meta">
              <time className="label" dateTime={p.date}>
                {formatDate(p.date)}
              </time>
              {p.categories
                .filter((c) => c.slug !== "blog")
                .slice(0, 1)
                .map((c) => (
                  <Link key={c.id} className="label" href={c.path}>
                    {c.name}
                  </Link>
                ))}
            </div>
            <h2>
              <Link href={p.path}>{p.title}</Link>
            </h2>
            {p.excerpt ? <p>{p.excerpt}</p> : null}
          </div>
          {p.image ? (
            <Link
              href={p.path}
              className="cx-post-thumb"
              tabIndex={-1}
              aria-hidden="true"
            >
              <ContentImageFill
                url={p.image.url}
                alt={p.image.alt}
                priority={i < 2}
              />
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ContentImageFill({
  url,
  alt,
  priority,
}: {
  url: string;
  alt: string;
  priority: boolean;
}) {
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes="(max-width: 700px) 100vw, 220px"
      priority={priority}
    />
  );
}

export function Pager({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const href = (n: number) => (n <= 1 ? basePath : `${basePath}page/${n}/`);
  return (
    <nav className="cx-pager" aria-label="Pagination">
      {page > 1 ? (
        <Link className="btn ghost" href={href(page - 1)} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="label">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link className="btn ghost" href={href(page + 1)} rel="next">
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
