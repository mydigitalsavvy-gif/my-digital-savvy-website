import type { Service } from "@/types/home";
import { accentStyle } from "@/components/ui/accent";
import { Lines } from "@/components/ui/rich-text";
import { ServiceIcon } from "./ServiceIcon";

export function ServicePanel({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  return (
    <article
      className={index === 0 ? "wd-panel is-on" : "wd-panel"}
      style={accentStyle(service.color)}
      data-i={index}
    >
      <ServiceIcon icon={service.icon} />
      <span className="label wd-eyebrow">Service {service.number}</span>
      <h3 className="display wd-title">
        <Lines lines={service.titleLines} />
      </h3>
      <p className="wd-sub">{service.sub}</p>
      <p className="wd-how">
        <b>How</b>
        {service.how}
      </p>
      <div className="wd-deliverables">
        <span className="label wd-deliv-label">Key deliverables</span>
        <div className="wd-tags">
          {service.deliverables.map((d) => (
            <b key={d}>{d}</b>
          ))}
        </div>
      </div>
      <p className="wd-outcome">{service.outcome}</p>
      <div className="wd-actions">
        <a href={service.cta.href} className="btn solid wd-cta">
          {service.cta.label}
        </a>
        <a href={service.caseLink.href} className="wd-case-link">
          {service.caseLink.label}
        </a>
      </div>
    </article>
  );
}
