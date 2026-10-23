/**
 * JSON-LD structured data builders. Real, already-published business facts
 * only — every value below is copied from the live site's existing
 * LocalBusiness schema (my-digital-savvy-v2.html) or mds-theme/functions.php,
 * not invented for this rebuild. Once lib/wordpress/site-settings.ts is
 * wired to the real WP backend, swap these constants for values pulled
 * from getSiteSettings() so a content editor can update them without a
 * code change — leave hard-coded until then rather than guessing a shape.
 */

export const ORGANIZATION_FACTS = {
  name: "My Digital Savvy",
  url: "https://mydigitalsavvy.com",
  telephone: "+91-8149105083",
  whatsapp: "918149105083",
  email: "hello@mydigitalsavvy.com",
  foundingDate: "2018",
  addresses: [
    {
      streetAddress: "Shop No 67, 1st Floor, Rahul Complex 2, Ganeshpeth",
      addressLocality: "Nagpur",
      postalCode: "440018",
      addressRegion: "Maharashtra",
    },
    {
      streetAddress:
        "15/16, NMC Complex, 1st Floor, J.B. Wing, Mangalwari, Sadar",
      addressLocality: "Nagpur",
      postalCode: "440001",
      addressRegion: "Maharashtra",
    },
  ],
  areaServed: ["Nagpur", "Indore", "Raipur", "Hyderabad", "Jabalpur"],
  sameAs: [
    "https://www.facebook.com/profile.php?id=61553360870147",
    "https://www.instagram.com/mydigitalsavvy/",
    "https://www.linkedin.com/company/my-digital-savvy/",
  ],
} as const;

export function buildLocalBusinessSchema() {
  const f = ORGANIZATION_FACTS;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: f.name,
    url: f.url,
    telephone: f.telephone,
    email: f.email,
    foundingDate: f.foundingDate,
    address: f.addresses.map((address) => ({
      "@type": "PostalAddress",
      ...address,
      addressCountry: "IN",
    })),
    areaServed: f.areaServed,
    sameAs: f.sameAs,
    // No aggregateRating: Google does not allow a business to mark up
    // reviews of itself, and it risks a structured-data manual action.
  };
}

export function buildArticleSchema(article: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  imageUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: article.url,
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    author: article.authorName
      ? { "@type": "Person", name: article.authorName }
      : { "@type": "Organization", name: ORGANIZATION_FACTS.name },
    image: article.imageUrl ? [article.imageUrl] : undefined,
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION_FACTS.name,
      url: ORGANIZATION_FACTS.url,
    },
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/* ── Phase 5 builders ────────────────────────────────────────────── */

const ORG_ID = `${ORGANIZATION_FACTS.url}/#organization`;

/** Every page. LocalBusiness (home + contact) refers back to it by @id. */
export function buildOrganizationSchema() {
  const f = ORGANIZATION_FACTS;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: f.name,
    url: `${f.url}/`,
    email: f.email,
    telephone: f.telephone,
    foundingDate: f.foundingDate,
    sameAs: f.sameAs,
  };
}

/** Service page. `provider` points at the Organization; no ratings or offers are claimed. */
export function buildServiceSchema(service: {
  name: string;
  description?: string | null;
  url: string;
  serviceType?: string | null;
  areaServed?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    ...(service.description ? { description: service.description } : {}),
    ...(service.serviceType ? { serviceType: service.serviceType } : {}),
    url: service.url,
    provider: {
      "@type": "Organization",
      "@id": ORG_ID,
      name: ORGANIZATION_FACTS.name,
    },
    areaServed: (service.areaServed ?? ["Nagpur"]).map((name) => ({
      "@type": "City",
      name,
    })),
  };
}

/** Only for FAQs actually shown on the page. Returns null when there are none. */
export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  const items = faqs.filter((f) => f.question && f.answer);
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
