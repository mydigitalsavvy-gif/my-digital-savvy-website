import type { WorkContent } from "@/types/home";
import { PortfolioOrrery } from "@/components/interactions/PortfolioOrrery";

/**
 * "Our work": a live solar system in place of the old Selected Work list.
 * The whole system is one link to the portfolio site, so a click on any
 * planet, moon, orbit or star goes there; it is a plain link, so it works
 * before (and without) the renderer, and ctrl/cmd-click opens a new tab.
 * The heading sits in the page's text column; the system runs edge to
 * edge.
 */
export function PortfolioSystem({ work }: { work: WorkContent }) {
  return (
    <section id="work" aria-labelledby="work-heading">
      <div className="wrap">
        <div className="head reveal">
          <h2 id="work-heading">{work.heading}</h2>
          <span className="label">{work.label}</span>
        </div>
      </div>
      <a className="orrery reveal" href={work.href} aria-label={work.ariaLabel}>
        <PortfolioOrrery live={work.live} />
        <span className="orrery-cta" aria-hidden="true">
          {work.cta}
          <span className="orrery-cta-arrow">↗</span>
        </span>
      </a>
    </section>
  );
}
