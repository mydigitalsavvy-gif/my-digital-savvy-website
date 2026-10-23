import type { AboutContent } from "@/types/home";
import { Lines, RichText } from "@/components/ui/rich-text";

export function About({ about }: { about: AboutContent }) {
  return (
    <section className="wrap" id="about" aria-labelledby="about-heading">
      <div className="head reveal">
        <h2 id="about-heading">{about.heading}</h2>
        <span className="label">{about.label}</span>
      </div>
      <div className="about-layout reveal-group">
        <p className="about-lead">{about.lead}</p>
        <div className="about-pull">
          {/* CONFIRM: figure flagged for verification in the reference */}
          <div className="about-pull-num">
            {about.pullValue}
            <span>{about.pullSuffix}</span>
          </div>
          <div className="about-pull-label">
            <Lines lines={about.pullLabelLines} />
          </div>
        </div>
        <p className="about-note">
          <RichText value={about.note} />
        </p>
      </div>
    </section>
  );
}
