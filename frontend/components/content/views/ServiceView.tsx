import Link from "next/link";
import type { ServicePageModel } from "@/types/content";
import { getHomeContent } from "@/lib/content/home";
import { blocksToText, inlinesToText } from "@/lib/content/text";
import { absoluteUrl } from "@/lib/site";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildServiceSchema,
} from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { AuditCTA } from "@/components/sections/AuditCTA";
import { Contact } from "@/components/sections/Contact";
import { ServiceIcon } from "@/components/sections/services/ServiceIcon";
import { accentStyle } from "@/components/ui/accent";
import { Blocks, Cards, Steps } from "../Blocks";
import { Faqs, PageHero, SectionHead } from "../PageParts";

export async function ServiceView({ model }: { model: ServicePageModel }) {
  const home = await getHomeContent();
  const catalogue = model.catalogueSlug
    ? home.services.items.find((s) => s.slug === model.catalogueSlug)
    : undefined;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services/" },
    { name: model.title, path: model.path },
  ];
  const description =
    model.seo?.description ||
    model.shortDescription ||
    inlinesToText(model.heroIntro) ||
    null;

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) }))
        )}
      />
      <JsonLd
        data={buildServiceSchema({
          name: model.title,
          description,
          url: absoluteUrl(model.path),
          serviceType: catalogue?.name ?? null,
        })}
      />
      {(() => {
        const faq = buildFaqSchema(
          model.faqs.map((f) => ({
            question: f.question,
            answer: blocksToText(f.answer),
          }))
        );
        return faq ? <JsonLd data={faq} /> : null;
      })()}

      <main style={catalogue ? accentStyle(catalogue.color) : undefined}>
        <PageHero
          crumbs={crumbs}
          eyebrow={
            catalogue
              ? `Service ${catalogue.number} · ${catalogue.name}`
              : "Service"
          }
          heading={model.heroHeading}
          intro={
            model.heroIntro.length ? model.heroIntro : model.shortDescription
          }
          image={model.heroImage}
        >
          <div className="btns">
            <a href={model.cta.href} className="btn solid">
              {model.cta.label}
            </a>
            <Link href="/services/" className="btn ghost">
              All services
            </Link>
          </div>
        </PageHero>

        {model.body.length || catalogue ? (
          <section className="wrap cx-section">
            <div className="cx-layout">
              <Blocks blocks={model.body} />
              {catalogue ? (
                <aside
                  className="cx-aside"
                  style={accentStyle(catalogue.color)}
                >
                  <ServiceIcon icon={catalogue.icon} />
                  <span className="label">At a glance</span>
                  <p>{catalogue.how}</p>
                  <div className="wd-tags">
                    {catalogue.deliverables.map((d) => (
                      <b key={d}>{d}</b>
                    ))}
                  </div>
                  <p className="wd-outcome">{catalogue.outcome}</p>
                  <a href={model.cta.href} className="btn solid">
                    {catalogue.cta.label}
                  </a>
                </aside>
              ) : null}
            </div>
          </section>
        ) : null}

        {model.benefits.length ? (
          <section
            className="wrap cx-section"
            aria-labelledby="benefits-heading"
          >
            <SectionHead
              title="What you get"
              label="Benefits"
              id="benefits-heading"
            />
            <Cards
              items={model.benefits.map((b) => ({
                title: b.title,
                body: b.body ? [{ type: "text" as const, text: b.body }] : [],
                image: b.image ?? null,
              }))}
            />
          </section>
        ) : null}

        {model.process.length ? (
          <section
            className="wrap cx-section"
            aria-labelledby="process-heading"
          >
            <SectionHead
              title="How we deliver"
              label={`${model.process.length} stages`}
              id="process-heading"
            />
            <Steps items={model.process} />
          </section>
        ) : null}

        <Faqs faqs={model.faqs} />

        {model.relatedCaseStudies.length ? (
          <section
            className="wrap cx-section"
            aria-labelledby="related-heading"
          >
            <SectionHead
              title="Related work"
              label="Case studies"
              id="related-heading"
            />
            <ul className="work-list">
              {model.relatedCaseStudies.map((cs) => (
                <li className="work-row" key={cs.id}>
                  <Link className="work-name" href={cs.path}>
                    {cs.clientName ?? cs.title}
                  </Link>
                  {cs.industry ? (
                    <span className="work-tag">{cs.industry}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <AuditCTA audit={home.audit} />
        <Contact contact={home.contact} />
      </main>
    </>
  );
}
