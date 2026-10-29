import type { Metadata } from "next";
import { getJobsFeed, listOpportunityCategories } from "@/lib/careers/jobs";
import { isJobOpen } from "@/types/careers";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { SectionHead } from "@/components/content/PageParts";
import { CareersHero } from "@/components/careers/CareersHero";
import { OpportunityCategories } from "@/components/careers/OpportunityCategories";
import { JobBoard } from "@/components/careers/JobBoard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Open roles at My Digital Savvy in digital marketing, social media, design, video and HR, plus freelance and white-label partnership opportunities.",
  alternates: { canonical: "/careers/" },
};

export default async function CareersHub() {
  const [feed, categories] = await Promise.all([getJobsFeed(), listOpportunityCategories()]);
  const openVacancies = feed.jobs.filter(isJobOpen).reduce((sum, j) => sum + j.vacancies, 0);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Careers", path: "/careers/" },
  ];

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema(crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) })))}
      />
      <main>
        <CareersHero openVacancies={openVacancies} />
        <OpportunityCategories categories={categories} />
        <section className="wrap cx-section" id="positions" aria-labelledby="positions-heading">
          <SectionHead title="Open positions" label="Current openings" id="positions-heading" />
          {feed.degraded ? (
            <p className="cy-feed-notice" role="status">
              We&apos;re having trouble loading the latest openings right now, so recent listings
              are shown below. Refresh in a moment for the current list.
            </p>
          ) : null}
          <JobBoard jobs={feed.jobs} />
        </section>
      </main>
    </>
  );
}
