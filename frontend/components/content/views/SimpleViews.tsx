import Link from "next/link";
import type {
  CaseStudyModel,
  GenericPageModel,
  IndustryModel,
} from "@/types/content";
import type { AccentSlot } from "@/types/home";
import { getHomeContent } from "@/lib/content/home";
import { absoluteUrl } from "@/lib/site";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { AuditCTA } from "@/components/sections/AuditCTA";
import { accentStyle } from "@/components/ui/accent";
import { Blocks, ContentImage } from "../Blocks";
import { PageHero, SectionHead } from "../PageParts";

/** Same dot/green/blue/magenta rhythm as the homepage industries cards. */
const PAIN_COLORS: AccentSlot[] = ["dot", "green", "blue", "magenta"];

const crumbSchema = (crumbs: { name: string; path: string }[]) =>
  buildBreadcrumbSchema(
    crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) }))
  );

/** Any page without a dedicated template. */
export function GenericPageView({ model }: { model: GenericPageModel }) {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: model.title, path: model.path },
  ];
  return (
    <>
      <JsonLd data={crumbSchema(crumbs)} />
      <main>
        <PageHero
          crumbs={crumbs}
          eyebrow="My Digital Savvy"
          heading={model.title}
        />
        {model.body.length ? (
          <section className="wrap cx-section">
            <Blocks blocks={model.body} />
          </section>
        ) : null}
      </main>
    </>
  );
}

/** Case study: Problem → Strategy → Execution → Result, like the homepage preview format. */
export async function CaseStudyView({ model }: { model: CaseStudyModel }) {
  const home = await getHomeContent();
  // No case-studies hub exists to link an intermediate crumb to (the
  // homepage section was a placeholder, never real content) — straight
  // from Home to the study itself rather than a dangling middle link.
  const crumbs = [
    { name: "Home", path: "/" },
    { name: model.title, path: model.path },
  ];
  const parts = [
    { label: "Problem", blocks: model.challenge },
    { label: "Strategy", blocks: model.strategy },
    { label: "Execution", blocks: model.execution },
    { label: "Result", blocks: model.results },
  ].filter((p) => p.blocks.length);

  return (
    <>
      <JsonLd data={crumbSchema(crumbs)} />
      <JsonLd
        data={buildArticleSchema({
          title: model.title,
          description:
            model.seo?.description ||
            `${model.clientName ?? model.title} case study`,
          url: absoluteUrl(model.path),
          datePublished: model.date ?? new Date(0).toISOString(),
          imageUrl: model.gallery[0]?.url,
        })}
      />
      <main>
        <PageHero
          crumbs={crumbs}
          eyebrow={["Case study", model.industry].filter(Boolean).join(" · ")}
          heading={model.clientName ?? model.title}
          intro={model.clientName ? model.title : null}
        />
        {model.metrics.length ? (
          <section className="wrap cx-section" aria-label="Verified results">
            <div className="results-row">
              {model.metrics.map((m) => (
                <div className="result-fact" key={m.label}>
                  <div className="result-num">{m.value}</div>
                  <div className="result-label">
                    {m.label}
                    {m.period ? ` · ${m.period}` : ""}
                  </div>
                  <p className="results-note" style={{ marginTop: 10 }}>
                    Source: {m.source}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {parts.map((p) => (
          <section
            className="wrap cx-section"
            key={p.label}
            aria-label={p.label}
          >
            <SectionHead title={p.label} />
            <Blocks blocks={p.blocks} />
          </section>
        ))}
        {model.gallery.length ? (
          <section className="wrap cx-section" aria-label="Gallery">
            {model.gallery.map((g) => (
              <figure className="cx-figure" key={g.url}>
                <ContentImage image={g} sizes="100vw" />
              </figure>
            ))}
          </section>
        ) : null}
        {model.testimonial ? (
          <section className="wrap cx-section" aria-label="Client testimonial">
            <blockquote className="proof-featured">
              <p className="quote">{model.testimonial.review}</p>
              <p className="who">
                — {model.testimonial.name}
                {model.testimonial.company
                  ? ` · ${model.testimonial.company}`
                  : ""}
              </p>
            </blockquote>
          </section>
        ) : null}
        <AuditCTA
          audit={{
            ...home.audit,
            cta: { ...home.audit.cta, href: "/#contact" },
          }}
        />
      </main>
    </>
  );
}

export async function IndustryView({ model }: { model: IndustryModel }) {
  const home = await getHomeContent();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Industries", path: "/#industries" },
    { name: model.title, path: model.path },
  ];
  return (
    <>
      <JsonLd data={crumbSchema(crumbs)} />
      <main>
        <PageHero crumbs={crumbs} eyebrow="Industry" heading={model.title} />
        {model.intro.length ? (
          <section className="wrap cx-section">
            <Blocks blocks={model.intro} />
          </section>
        ) : null}
        {model.painPoints.length ? (
          <section className="wrap cx-section" aria-labelledby="pain-heading">
            <SectionHead title="What gets in the way" id="pain-heading" />
            <ul className="industry-grid" style={{ listStyle: "none" }}>
              {model.painPoints.map((p, i) => (
                <li
                  className="industry-card"
                  key={p.title}
                  style={accentStyle(PAIN_COLORS[i % PAIN_COLORS.length])}
                >
                  <span className="industry-num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="industry-tag">{p.title}</span>
                  <p className="industry-focus">{p.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {model.services.length ? (
          <section className="wrap cx-section" aria-labelledby="ind-services">
            <SectionHead title="Services" id="ind-services" />
            <ul className="work-list">
              {model.services.map((s) => (
                <li className="work-row" key={s.name}>
                  {s.path ? (
                    <Link className="work-name" href={s.path}>
                      {s.name}
                    </Link>
                  ) : (
                    <span className="work-name">{s.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <AuditCTA
          audit={{
            ...home.audit,
            cta: { ...home.audit.cta, href: "/#contact" },
          }}
        />
      </main>
    </>
  );
}
