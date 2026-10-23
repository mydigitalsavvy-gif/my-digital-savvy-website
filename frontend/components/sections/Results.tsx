import type { ResultsContent } from "@/types/home";
import { CountUp } from "@/components/interactions/CountUp";

/** Reference element ids for the four counted figures (4.9 is static). */
const COUNT_IDS = ["resClients", "resYears", "resReviews", "", "resSat"];

export function Results({ results }: { results: ResultsContent }) {
  return (
    <section className="wrap" id="results" aria-labelledby="results-heading">
      <div className="head reveal">
        <h2 id="results-heading">{results.heading}</h2>
        <span className="label">{results.label}</span>
      </div>
      <div className="results-row reveal-group">
        {results.facts.map((f, i) => (
          <div className="result-fact" key={f.label}>
            <div className="result-num">
              {f.countTo === null ? (
                f.display
              ) : (
                <>
                  <CountUp
                    target={f.countTo}
                    rootId="results"
                    id={COUNT_IDS[i] || undefined}
                  />
                  {f.suffix === "+" ? <sup>+</sup> : f.suffix}
                </>
              )}
            </div>
            <div className="result-label">{f.label}</div>
          </div>
        ))}
      </div>
      <p className="results-note">{results.note}</p>
    </section>
  );
}
