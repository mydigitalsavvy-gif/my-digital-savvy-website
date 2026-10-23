import type { CaseStudiesContent } from "@/types/home";

/** PLACEHOLDER state kept from the reference: a format preview, not a real case study. */
export function CaseStudies({
  caseStudies,
}: {
  caseStudies: CaseStudiesContent;
}) {
  return (
    <section
      className="wrap"
      id="case-studies"
      aria-labelledby="case-studies-heading"
    >
      <div className="head reveal">
        <h2 id="case-studies-heading">{caseStudies.heading}</h2>
        <span className="label">{caseStudies.label}</span>
      </div>
      <div className="cs-card reveal">
        <span className="cs-badge">{caseStudies.badge}</span>
        <div className="cs-grid">
          {caseStudies.steps.map((s) => (
            <div className="cs-step" key={s.label}>
              <span className="label">{s.label}</span>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
        <a href={caseStudies.cta.href} className="btn ghost">
          {caseStudies.cta.label}
        </a>
      </div>
    </section>
  );
}
