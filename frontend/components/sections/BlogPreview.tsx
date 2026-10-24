import Link from "next/link";
import type { BlogPreviewContent } from "@/types/home";
import type { PostSummary } from "@/types/content";
import { LottieVisual } from "@/components/interactions/LottieVisual";
import { ContentImage } from "@/components/content/Blocks";

/**
 * Real recent post thumbnails when WordPress has them (the normal case
 * now that the blog is live); falls back to the original decorative
 * illustration only when no posts were fetched (WordPress unreachable),
 * so this never shows a broken image or an empty gap.
 */
export function BlogPreview({
  blog,
  posts = [],
}: {
  blog: BlogPreviewContent;
  posts?: PostSummary[];
}) {
  return (
    <section className="wrap" id="blog" aria-labelledby="blog-heading">
      <div className="head reveal">
        <h2 id="blog-heading">{blog.heading}</h2>
        <span className="label">{blog.label}</span>
      </div>
      <div className="blog-coming reveal-group">
        <div className="blog-copy">
          <p>{blog.intro}</p>
          <a href={blog.cta.href} className="btn ghost">
            {blog.cta.label}
          </a>
        </div>
        {posts.length ? (
          <ul className="blog-preview-posts">
            {posts.slice(0, 3).map((p) => (
              <li key={p.id}>
                <Link href={p.path} className="blog-preview-post">
                  {p.image ? (
                    <span className="blog-preview-thumb">
                      <ContentImage image={p.image} sizes="72px" />
                    </span>
                  ) : null}
                  <span className="blog-preview-title">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <LottieVisual
            className="blog-visual"
            name="insights"
            still={180}
            width={360}
            height={260}
          />
        )}
      </div>
    </section>
  );
}
