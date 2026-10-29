import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/content/PageParts";
import { PartnershipForm } from "@/components/careers/PartnershipForm";

export const metadata: Metadata = {
  title: "Agency & Freelance Partnerships",
  description:
    "Freelancers and agencies interested in working with My Digital Savvy (including white-label delivery under your own brand) can get in touch here.",
  alternates: { canonical: "/careers/partnership/" },
};

export default function PartnershipPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Careers", path: "/careers/" },
    { name: "Partnerships", path: "/careers/partnership/" },
  ];
  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) })))} />
      <main>
        <PageHero
          crumbs={crumbs}
          eyebrow="Freelancers & agencies"
          heading="Work with My Digital Savvy"
          intro="If you're an independent professional looking for project-based work, or an agency that wants us to deliver services under your own brand, tell us a bit about what you're looking for. This is a separate enquiry from our job openings, not an employment application."
        />
        <section className="wrap cx-section">
          <PartnershipForm />
        </section>
      </main>
    </>
  );
}
