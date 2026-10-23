import type { IndustriesContent } from "@/types/home";
import { accentStyle } from "@/components/ui/accent";

export function Industries({ industries }: { industries: IndustriesContent }) {
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
        {industries.items.map((it) => (
          <div
            className="industry-card"
            style={accentStyle(it.color)}
            key={it.tag}
          >
            <span className="label industry-tag">{it.tag}</span>
            <p className="industry-clients">{it.clients}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
