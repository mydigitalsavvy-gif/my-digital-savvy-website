import type { Metadata } from "next";
import { buildLocalBusinessSchema } from "@/lib/seo/schema";
import { getHomeContent } from "@/lib/content/home";
import { getPageSeo, getPathIndex } from "@/lib/wordpress";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Results } from "@/components/sections/Results";
import { ServicesSection } from "@/components/sections/services/ServicesSection";
import { Think } from "@/components/sections/Think";
import { GrowthSystem } from "@/components/sections/GrowthSystem";
import { Industries } from "@/components/sections/Industries";
import { PortfolioSystem } from "@/components/sections/PortfolioSystem";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { About } from "@/components/sections/About";
import { BlogPreview } from "@/components/sections/BlogPreview";
import { Process } from "@/components/sections/Process";
import { Proof } from "@/components/sections/Proof";
import { WhyUs } from "@/components/sections/WhyUs";
import { AuditCTA } from "@/components/sections/AuditCTA";
import { Contact } from "@/components/sections/Contact";

/**
 * Homepage metadata from Yoast (the WordPress front page), so the title
 * and description that rank today carry over unchanged. Falls back to the
 * static values when WordPress is unavailable. No visual effect.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fallback = {
    path: "/",
    omitTwitterMisc: true,
    title: "My Digital Savvy — Digital marketing agency in Nagpur",
    description:
      "My Digital Savvy runs Meta Ads, builds websites and creates content for businesses across Nagpur, Indore, Raipur, Hyderabad and Jabalpur.",
  };
  try {
    const front = (await getPathIndex()).entries.find(
      (e) => e.kind === "front-page"
    );
    const seo = front ? await getPageSeo(front) : null;
    return buildMetadata(seo, fallback);
  } catch {
    return buildMetadata(null, fallback);
  }
}

/** Section order is the reference's order. Do not reorder. */
export default async function HomePage() {
  const c = await getHomeContent();

  return (
    <>
      <JsonLd data={buildLocalBusinessSchema()} />
      <main>
        <Hero hero={c.hero} />
        <Marquee
          items={c.clients}
          trackId="track"
          ariaLabel="Some of our clients"
        />
        <Results results={c.results} />
        <ServicesSection services={c.services} />
        <Think think={c.think} />
        <GrowthSystem growth={c.growth} />
        <Industries industries={c.industries} />
        <PortfolioSystem work={c.work} />
        <CaseStudies caseStudies={c.caseStudies} />
        <About about={c.about} />
        <BlogPreview blog={c.blog} />
        <Process process={c.process} />
        <Proof proof={c.proof} />
        <WhyUs why={c.why} />
        <AuditCTA audit={c.audit} />
        <Contact contact={c.contact} />
      </main>
    </>
  );
}
