import type { AuditContent } from "@/types/home";
import { Crimson } from "@/components/ui/rich-text";
import { LottieVisual } from "@/components/interactions/LottieVisual";

export function AuditCTA({ audit }: { audit: AuditContent }) {
  return (
    <section className="wrap" id="audit" aria-labelledby="audit-heading">
      <div className="audit-box reveal">
        {/* "what's leaking": leads leak from the funnel until the audit
            finds and patches both holes. */}
        <LottieVisual
          className="audit-visual"
          name="audit-funnel"
          still={170}
          width={320}
          height={250}
        />
        <span className="label">{audit.label}</span>
        <h2 id="audit-heading" className="display">
          {audit.heading}
          <Crimson />
        </h2>
        <p className="audit-copy">{audit.copy}</p>
        <a href={audit.cta.href} className="btn solid">
          {audit.cta.label}
        </a>
      </div>
    </section>
  );
}
