import type { HeroContent } from "@/types/home";
import { HeroRotor } from "@/components/interactions/HeroRotor";
import { RichText } from "@/components/ui/rich-text";
import { HeroVisual } from "@/components/interactions/HeroVisual";

export function Hero({ hero }: { hero: HeroContent }) {
  return (
    <section className="hero wrap" id="top">
      {/* "Pays for itself": spend bars, the return line climbing past them.
          Takes the rotor word's colour via --hero-accent, which is local to
          this section; placed by measurement. */}
      <HeroVisual />
      <div className="eyebrow reveal">
        <span className="pip" aria-hidden="true"></span>
        <span className="label">{hero.eyebrow}</span>
      </div>

      <h1 className="display reveal">
        {hero.headlineLead}{" "}
        <HeroRotor
          words={hero.rotorWords}
          initialLabel={hero.rotorInitialLabel}
        />
      </h1>

      <div className="hero-foot reveal">
        <p className="hero-sub">
          <RichText value={hero.sub} />
        </p>
        <div className="btns">
          <a href={hero.primaryCta.href} className="btn solid">
            {hero.primaryCta.label}
          </a>
          <a href={hero.secondaryCta.href} className="btn ghost">
            {hero.secondaryCta.label}
          </a>
        </div>
      </div>
    </section>
  );
}
