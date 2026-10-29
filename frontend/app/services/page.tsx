import type { Metadata } from "next";
import Link from "next/link";
import { getHomeContent } from "@/lib/content/home";
import { entriesOfKind } from "@/lib/wordpress";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/content/PageParts";
import { AuditCTA } from "@/components/sections/AuditCTA";
import { ServiceIcon } from "@/components/sections/services/ServiceIcon";
import { accentStyle } from "@/components/ui/accent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Services",
  description:
    "Meta Ads, SEO, website development, social media and more: nine services, one team, at My Digital Savvy.",
  alternates: { canonical: "/services/" },
};

/** Hub for every service page. Catalogue entries link to their existing landing page URL. */
export default async function ServicesHub() {
  const home = await getHomeContent();
  const pages = await entriesOfKind("service").catch(() => []);
  const linked = new Set(pages.map((p) => p.catalogueSlug).filter(Boolean));
  const extra = pages.filter((p) => !p.catalogueSlug);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services/" },
  ];

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) }))
        )}
      />
      <main>
        <PageHero
          crumbs={crumbs}
          eyebrow={home.nav.megaLabel}
          heading={home.services.heading}
          intro="Nine services, handled by one team: audits, search, paid ads, social, creative and the website that ties it together, so nothing falls through the cracks between vendors."
        >
          <div className="btns">
            <Link href="/#contact" className="btn solid">
              {home.hero.primaryCta.label}
            </Link>
          </div>
        </PageHero>
        <section className="wrap cx-section" aria-label="All services">
          <ul className="cx-service-grid">
            {home.services.items.map((s) => {
              const page = pages.find((p) => p.catalogueSlug === s.slug);
              const hasPage = Boolean(page && linked.has(s.slug));
              const content = (
                <>
                  <ServiceIcon icon={s.icon} />
                  <span className="cx-service-num">{s.number}</span>
                  <span className="cx-service-name">{s.name}</span>
                  <p className="cx-service-desc">{s.menuDescription}</p>
                  <span className="cx-service-cta">
                    {hasPage ? "Explore this service" : "Get a free audit"}{" "}
                    →
                  </span>
                </>
              );
              return (
                <li
                  className="cx-service-card"
                  style={accentStyle(s.menuColor)}
                  key={s.slug}
                >
                  <Link href={hasPage ? page!.path : "/#contact"}>
                    {content}
                  </Link>
                </li>
              );
            })}
            {extra.map((p) => (
              <li className="cx-service-card" key={p.path}>
                <Link href={p.path}>
                  <span className="cx-service-num">More</span>
                  <span className="cx-service-name">{p.title}</span>
                  <span className="cx-service-cta">Explore this service →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
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
