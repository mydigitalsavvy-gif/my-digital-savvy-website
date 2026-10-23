import type { ProofContent } from "@/types/home";
import { CountUp } from "@/components/interactions/CountUp";
import { RichText } from "@/components/ui/rich-text";
import { Marquee } from "./Marquee";

export function Proof({ proof }: { proof: ProofContent }) {
  return (
    <section className="wrap" id="proof" aria-labelledby="proof-heading">
      <div className="head reveal">
        <h2 id="proof-heading">{proof.heading}</h2>
        <span className="label">{proof.label}</span>
      </div>

      <div className="proof reveal-group">
        <blockquote className="proof-featured">
          <p className="quote">
            <RichText value={proof.featured.quote} />
          </p>
          <p className="who">
            — {proof.featured.name} · {proof.featured.source}
          </p>
        </blockquote>

        {/* CONFIRM: href is still the reference's placeholder review link. */}
        <a
          href={proof.rating.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rating"
          aria-label={proof.rating.ariaLabel}
        >
          <div className="big" id="ratingNum">
            {proof.rating.value}
          </div>
          <div className="stars" aria-hidden="true">
            ★★★★★
          </div>
          <p>
            {proof.rating.textBefore}
            <CountUp
              as="strong"
              target={proof.rating.reviewCount}
              rootId="proof"
              id="reviewCount"
            />
            {proof.rating.textAfter}
          </p>
        </a>

        <div className="proof-voices">
          {proof.voices.map((v) => (
            <blockquote key={v.name}>
              <p className="quote">
                <RichText value={v.quote} />
              </p>
              <p className="who">
                — {v.name} · {v.source}
              </p>
            </blockquote>
          ))}
        </div>
      </div>

      <Marquee
        items={proof.marqueeNames}
        className="strip proof-strip reveal"
        trackId="proofTrack"
        hideStrip
      />
    </section>
  );
}
