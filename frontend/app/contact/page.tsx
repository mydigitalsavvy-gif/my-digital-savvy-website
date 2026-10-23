import type { Metadata } from "next";
import { getHomeContent } from "@/lib/content/home";
import { buildLocalBusinessSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Contact } from "@/components/sections/Contact";
import { AuditCTA } from "@/components/sections/AuditCTA";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with My Digital Savvy — Ganeshpeth and Sadar offices in Nagpur, Maharashtra.",
  alternates: { canonical: "/contact/" },
};

/** New URL. Same Contact and Audit sections as the homepage, plus LocalBusiness data. */
export default async function ContactPage() {
  const c = await getHomeContent();
  return (
    <>
      <JsonLd data={buildLocalBusinessSchema()} />
      <main>
        <Contact contact={c.contact} />
        <AuditCTA audit={c.audit} />
      </main>
    </>
  );
}
