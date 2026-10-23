import type { WhyContent } from "@/types/home";
import { accentStyle } from "@/components/ui/accent";
import { WhyCarousel } from "@/components/interactions/WhyCarousel";

export function WhyUs({ why }: { why: WhyContent }) {
  const n = why.items.length;
  const pad = (k: number) => String(k).padStart(2, "0");
  return (
    <section className="wrap" id="why" aria-labelledby="why-heading">
      <div className="head reveal">
        <h2 id="why-heading">{why.heading}</h2>
        <span className="label">{why.label}</span>
      </div>

      <div className="why-shell reveal">
        <div
          className="why-track"
          id="whyTrack"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={why.ariaLabel}
        >
          <ul className="why-list reveal-group" id="whyList">
            {why.items.map((item, i) => (
              <li
                className="why-card"
                style={accentStyle(item.color)}
                key={item.title}
              >
                <span className="why-num" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="why-controls">
          <button
            type="button"
            className="why-arrow"
            id="whyPrev"
            aria-label="Previous reason"
          >
            ←
          </button>
          <div className="why-dots" id="whyDots" aria-hidden="true">
            {why.items.map((item, i) => (
              <span
                key={item.title}
                className={i === 0 ? "is-on" : undefined}
              ></span>
            ))}
          </div>
          <button
            type="button"
            className="why-arrow"
            id="whyNext"
            aria-label="Next reason"
          >
            →
          </button>
        </div>

        <div className="why-foot">
          <span className="label" id="whyCount" aria-hidden="true">
            01 / {pad(n)}
          </span>
          <a href={why.cta.href} className="btn solid">
            {why.cta.label}
          </a>
        </div>
      </div>
      <WhyCarousel />
    </section>
  );
}
