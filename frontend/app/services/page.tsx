import type { Metadata } from "next";
import Link from "next/link";
import { getHomeContent } from "@/lib/content/home";
import { entriesOfKind } from "@/lib/wordpress";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/content/PageParts";
import { AuditCTA } from "@/components/sections/AuditCTA";
import { accentStyle } from "@/components/ui/accent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Services",
  description:
    "Meta Ads, SEO, website development, social media and more — nine services, one team, at My Digital Savvy.",
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
        />
        <section className="wrap cx-section" aria-label="All services">
          <ul
            className="industry-grid"
            style={{
              listStyle: "none",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            }}
          >
            {home.services.items.map((s) => {
              const page = pages.find((p) => p.catalogueSlug === s.slug);
              const inner = (
                <>
                  <span className="label industry-tag">{s.number}</span>
                  <p
                    className="industry-clients"
                    style={{ fontWeight: 700, fontSize: 17 }}
                  >
                    {s.name}
                  </p>
                  <p
                    className="industry-clients"
                    style={{ color: "var(--ash)", marginTop: 8 }}
                  >
                    {s.menuDescription}
                  </p>
                </>
              );
              return (
                <li
                  className="industry-card"
                  style={accentStyle(s.menuColor)}
                  key={s.slug}
                >
                  {page && linked.has(s.slug) ? (
                    <Link href={page.path}>{inner}</Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
            {extra.map((p) => (
              <li className="industry-card" key={p.path}>
                <Link href={p.path}>
                  <span className="label industry-tag">More</span>
                  <p
                    className="industry-clients"
                    style={{ fontWeight: 700, fontSize: 17 }}
                  >
                    {p.title}
                  </p>
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
