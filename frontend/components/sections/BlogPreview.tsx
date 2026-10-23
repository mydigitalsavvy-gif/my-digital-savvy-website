import type { BlogPreviewContent } from "@/types/home";
import { LottieVisual } from "@/components/interactions/LottieVisual";

export function BlogPreview({ blog }: { blog: BlogPreviewContent }) {
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
        <LottieVisual
          className="blog-visual"
          name="insights"
          still={180}
          width={360}
          height={260}
        />
      </div>
    </section>
  );
}
