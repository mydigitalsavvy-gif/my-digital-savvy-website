import Link from "next/link";
import type { LocationPageModel } from "@/types/content";
import { getHomeContent } from "@/lib/content/home";
import { blocksToText } from "@/lib/content/text";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { AuditCTA } from "@/components/sections/AuditCTA";
import { Contact } from "@/components/sections/Contact";
import { Blocks } from "../Blocks";
import { Faqs, PageHero, SectionHead } from "../PageParts";

export async function LocationView({ model }: { model: LocationPageModel }) {
  const home = await getHomeContent();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: model.title, path: model.path },
  ];
  const faq = buildFaqSchema(
    model.faqs.map((f) => ({
      question: f.question,
      answer: blocksToText(f.answer),
    }))
  );

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) }))
        )}
      />
      {faq ? <JsonLd data={faq} /> : null}
      <main>
        <PageHero
          crumbs={crumbs}
          eyebrow={
            model.city
              ? `Digital marketing agency · ${model.city}`
              : "Digital marketing agency"
          }
          heading={model.heroHeading}
          intro={model.intro}
        >
          <div className="btns">
            <a href="#contact" className="btn solid">
              Get your free audit
            </a>
            <Link href="/services/" className="btn ghost">
              See what we do
            </Link>
          </div>
        </PageHero>

        {model.body.length ? (
          <section className="wrap cx-section">
            <Blocks blocks={model.body} />
          </section>
        ) : null}

        {model.servicesOffered.length ? (
          <section className="wrap cx-section" aria-labelledby="loc-services">
            <SectionHead
              title="Services here"
              label={model.city ?? undefined}
              id="loc-services"
            />
            <ul className="work-list">
              {model.servicesOffered.map((s) => (
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

        {model.localProof.length ? (
          <section className="wrap cx-section" aria-labelledby="loc-proof">
            <SectionHead title="Local proof" id="loc-proof" />
            <Blocks blocks={model.localProof} />
          </section>
        ) : null}

        <Faqs faqs={model.faqs} />
        <AuditCTA audit={home.audit} />
        <Contact contact={home.contact} />
      </main>
    </>
  );
}
