import type { Metadata } from "next";
import Link from "next/link";
import { getHomeContent } from "@/lib/content/home";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/content/PageParts";
import { About } from "@/components/sections/About";
import { Think } from "@/components/sections/Think";
import { Process } from "@/components/sections/Process";
import { AuditCTA } from "@/components/sections/AuditCTA";

export const metadata: Metadata = {
  title: "About",
  description:
    "My Digital Savvy is a digital marketing agency based in Nagpur, Maharashtra — one team running Meta Ads, websites and content for businesses across Maharashtra.",
  alternates: { canonical: "/about/" },
};

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about/" },
];

/** Reuses the homepage's own About, Think and Process sections — see each for its data source. */
export default async function AboutPage() {
  const c = await getHomeContent();
  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(
          crumbs.map((cr) => ({ name: cr.name, url: absoluteUrl(cr.path) }))
        )}
      />
      <main>
        <PageHero
          crumbs={crumbs}
          eyebrow="My Digital Savvy"
          heading="About Us"
          intro="Who we are, how we work, and what you can expect when you hire us."
        >
          <div className="btns">
            <Link href="/#contact" className="btn solid">
              Get your free audit
            </Link>
            <Link href="/services/" className="btn ghost">
              See our services
            </Link>
          </div>
        </PageHero>
        <About about={c.about} />
        <Think think={c.think} />
        <Process process={c.process} />
        <AuditCTA
          audit={{
            ...c.audit,
            cta: { ...c.audit.cta, href: "/#contact" },
          }}
        />
      </main>
    </>
  );
}
