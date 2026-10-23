import type { ProcessContent } from "@/types/home";
import { LottieVisual } from "@/components/interactions/LottieVisual";

/** Audit, Plan, Build, Report, in step order. */
const STEP_VISUALS = [
  { name: "process-audit", still: 125 },
  { name: "process-plan", still: 60 },
  { name: "process-build", still: 110 },
  { name: "process-report", still: 120 },
];

export function Process({ process }: { process: ProcessContent }) {
  return (
    <section className="wrap" id="process" aria-labelledby="process-heading">
      <div className="head reveal">
        <h2 id="process-heading">{process.heading}</h2>
        <span className="label">{process.label}</span>
      </div>
      <div className="steps reveal-group">
        {process.steps.map((s, i) => (
          <div className="step" key={s.number}>
            {STEP_VISUALS[i] && (
              <LottieVisual
                className="step-visual"
                name={STEP_VISUALS[i].name}
                still={STEP_VISUALS[i].still}
                width={120}
                height={120}
              />
            )}
            <div className="n" aria-hidden="true">
              {s.number}
            </div>
            {/* h5 kept for parity: the reference styles `.step h5`. */}
            <h5>{s.title}</h5>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
