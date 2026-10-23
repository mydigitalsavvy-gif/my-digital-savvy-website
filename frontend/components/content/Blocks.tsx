import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import type {
  CardItem,
  ContentBlock,
  ImageAsset,
  Inline,
} from "@/types/content";

/** Typed inline content → elements. No HTML strings are ever injected. */
export function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((it, i) => {
        switch (it.type) {
          case "text":
            return <Fragment key={i}>{it.text}</Fragment>;
          case "break":
            return <br key={i} />;
          case "strong":
            return (
              <strong key={i}>
                <Inlines items={it.children} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <Inlines items={it.children} />
              </em>
            );
          case "link":
            return it.external ? (
              <a
                key={i}
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Inlines items={it.children} />
              </a>
            ) : it.href.startsWith("/") ? (
              // No prefetch: CMS links aren't guaranteed to exist (some
              // legacy content links are broken), and prefetching them adds
              // background 404s. Navigation itself is unchanged.
              <Link key={i} href={it.href} prefetch={false}>
                <Inlines items={it.children} />
              </Link>
            ) : (
              <a key={i} href={it.href}>
                <Inlines items={it.children} />
              </a>
            );
        }
      })}
    </>
  );
}

export function ContentImage({
  image,
  sizes = "(max-width: 900px) 100vw, 72ch",
  priority = false,
}: {
  image: ImageAsset;
  sizes?: string;
  priority?: boolean;
}) {
  // Intrinsic dimensions from WordPress keep layout stable (no CLS).
  const width = image.width ?? 1200;
  const height = image.height ?? Math.round(width * 0.5625);
  return (
    <Image
      src={image.url}
      alt={image.alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      style={{ width: "100%", height: "auto" }}
    />
  );
}

/** Structured blocks → MDS article typography. */
export function Blocks({
  blocks,
  className = "cx-body",
}: {
  blocks: ContentBlock[];
  className?: string;
}) {
  if (!blocks.length) return null;
  return (
    <div className={className}>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as "h2" | "h3" | "h4";
      return (
        <Tag>
          <Inlines items={block.content} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p>
          <Inlines items={block.content} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inlines items={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "image":
      return (
        <figure className="cx-figure">
          <ContentImage image={block.image} />
          {block.caption ? (
            <figcaption>
              <Inlines items={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case "quote":
      return (
        <blockquote>
          <Inlines items={block.content} />
        </blockquote>
      );
    case "steps":
      return <Steps items={block.items} />;
    case "cards":
      return <Cards items={block.items} />;
  }
}

/** Feature cards in the homepage's industry-card vocabulary. */
export function Cards({ items }: { items: CardItem[] }) {
  return (
    <ul className="cx-cards">
      {items.map((c, i) => (
        <li className="cx-card" key={i}>
          {c.image ? (
            <span className="cx-card-icon">
              <Image
                src={c.image.url}
                alt={c.image.alt}
                width={48}
                height={48}
                sizes="48px"
              />
            </span>
          ) : null}
          {c.title ? <h3>{c.title}</h3> : null}
          {c.body.length ? (
            <p>
              <Inlines items={c.body} />
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Steps({
  items,
}: {
  items: { title: string; body: ContentBlock[] }[];
}) {
  return (
    <ol className="cx-steps">
      {items.map((s, i) => (
        <li className="cx-step" key={i}>
          <div className="cx-step-n" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </div>
          <div>
            <h3>{s.title}</h3>
            <Blocks blocks={s.body} />
          </div>
        </li>
      ))}
    </ol>
  );
}
