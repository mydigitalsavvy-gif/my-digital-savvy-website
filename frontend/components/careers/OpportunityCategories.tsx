import Link from "next/link";
import type { OpportunityCategory } from "@/types/careers";
import { SectionHead } from "@/components/content/PageParts";

const LINKS: Record<OpportunityCategory["type"], { href: string; cta: string }> = {
  "full-time": { href: "#positions", cta: "See open roles" },
  freelance: { href: "/careers/partnership/", cta: "Get in touch" },
  "white-label": { href: "/careers/partnership/", cta: "Enquire as an agency" },
};

export function OpportunityCategories({
  categories,
}: {
  categories: OpportunityCategory[];
}) {
  return (
    <section className="wrap cx-section" aria-labelledby="opportunities-heading">
      <SectionHead title="Ways to work with us" label="Opportunities" id="opportunities-heading" />
      <ul className="cy-category-grid">
        {categories.map((cat) => {
          const link = LINKS[cat.type];
          return (
            <li className="cy-category-card" key={cat.type}>
              <h3>{cat.label}</h3>
              <p>{cat.description}</p>
              <Link href={link.href} className="cy-category-cta">
                {link.cta} →
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
