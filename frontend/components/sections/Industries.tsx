import type { IndustriesContent } from "@/types/home";
import { accentStyle } from "@/components/ui/accent";

/**
 * No client names here on purpose — this is a map of the industries we
 * work in and why digital marketing matters to each, not a client list
 * (see Case Studies / testimonials for actual client results).
 */
export function Industries({
  industries,
}: {
  industries: IndustriesContent;
}) {
  return (
    <section
      className="wrap"
      id="industries"
      aria-labelledby="industries-heading"
    >
      <div className="head reveal">
        <h2 id="industries-heading">{industries.heading}</h2>
        <span className="label">{industries.label}</span>
      </div>
      <div className="industry-grid reveal-group">
        {industries.items.map((it, i) => (
          <div
            className="industry-card"
            style={accentStyle(it.color)}
            key={it.tag}
          >
            <span className="industry-num" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="industry-tag">{it.tag}</span>
            <p className="industry-focus">{it.focus}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
