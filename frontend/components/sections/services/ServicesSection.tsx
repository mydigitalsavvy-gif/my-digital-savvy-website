import type { ServicesContent } from "@/types/home";
import { cssVars } from "@/components/ui/accent";
import { ServicePanel } from "./ServicePanel";
import { ServicesScroll } from "./ServicesScroll";
import { SolarSystemNav } from "@/components/interactions/SolarSystemNav";

/**
 * Pinned nine-panel sequence. Server-rendered in the state the reference
 * reaches right after load (panel 01 active); ServicesScroll then drives it
 * from scroll position. The index beside the panels is a solar system
 * (Sun = service 01 … Neptune = 09) that follows the active panel.
 */
export function ServicesSection({ services }: { services: ServicesContent }) {
  const n = services.items.length;
  return (
    <section id="services" aria-labelledby="svc-heading">
      <div className="wrap">
        <div className="head reveal">
          <h2 id="svc-heading">{services.heading}</h2>
          <span className="label">{services.label}</span>
        </div>
      </div>

      <div className="wd-track" id="wdTrack" style={cssVars({ "--n": n })}>
        <div className="wd-stage">
          {/* the service index: Sun + eight planets, one per service */}
          <SolarSystemNav count={n} />

          {/* how far through the nine services */}
          <div className="wd-progress" aria-hidden="true">
            <div className="wd-progress-fill" id="wdProgressFill"></div>
          </div>

          <div className="wd-panels" id="wdPanels">
            {services.items.map((s, i) => (
              <ServicePanel key={s.slug} service={s} index={i} />
            ))}
          </div>
        </div>
      </div>
      <ServicesScroll />
    </section>
  );
}
