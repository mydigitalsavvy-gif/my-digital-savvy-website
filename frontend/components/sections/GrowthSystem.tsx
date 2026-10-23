import type { GrowthContent } from "@/types/home";
import { accentStyle, cssVars } from "@/components/ui/accent";
import { GrowthScroll } from "@/components/interactions/GrowthScroll";
import { LottieVisual } from "@/components/interactions/LottieVisual";

/** One illustration per stage, in stage order: Traffic, Ads & SEO,
 *  Website, Lead, WhatsApp & Sales, Growth. `still` is the finished
 *  frame shown under reduced motion. */
const STAGE_VISUALS = [
  { name: "growth-traffic", still: 50 },
  { name: "growth-ads", still: 140 },
  { name: "growth-website", still: 150 },
  { name: "growth-lead", still: 140 },
  { name: "growth-whatsapp", still: 170 },
  { name: "growth-growth", still: 150 },
];

export function GrowthSystem({ growth }: { growth: GrowthContent }) {
  const n = growth.stages.length;
  const pad = (k: number) => String(k).padStart(2, "0");
  return (
    <section id="growth-system" aria-labelledby="growth-heading">
      <div
        className="growth-track"
        id="growthTrack"
        style={cssVars({ "--n": n })}
      >
        <div className="growth-stage">
          <div className="growth-head reveal">
            <span className="label">{growth.label}</span>
            <h2 id="growth-heading">{growth.heading}</h2>
          </div>

          <div className="growth-body">
            <ol className="growth-rail" id="growthRail" aria-hidden="true">
              {growth.stages.map((s, i) => (
                <li
                  key={s.title}
                  data-i={i}
                  className={i === 0 ? "is-on" : undefined}
                >
                  {s.railLabel}
                </li>
              ))}
            </ol>

            <div className="growth-cards" id="growthCards">
              {growth.stages.map((s, i) => (
                <article
                  key={s.title}
                  className={i === 0 ? "growth-card is-on" : "growth-card"}
                  data-i={i}
                  style={accentStyle(s.color)}
                >
                  <span className="growth-num">
                    {pad(i + 1)} / {pad(n)}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  {STAGE_VISUALS[i] && (
                    <LottieVisual
                      className="growth-visual"
                      name={STAGE_VISUALS[i].name}
                      still={STAGE_VISUALS[i].still}
                      width={400}
                      height={300}
                      gate=".growth-card"
                    />
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
      <GrowthScroll />
    </section>
  );
}
