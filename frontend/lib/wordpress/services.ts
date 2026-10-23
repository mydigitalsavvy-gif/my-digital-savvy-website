import "server-only";
import type { Faq, PathEntry, ServicePageModel } from "@/types/content";
import { htmlToBlocks, htmlToText, inlineText } from "./html-blocks";
import { splitHero } from "./hero";

export { splitHero };
import {
  getObject,
  getObjects,
  listObjects,
  type ReadOptions,
} from "./objects";
import {
  featuredImage,
  imageField,
  normalizeSeo,
  pathFromLink,
  relIds,
  title,
} from "./normalize";
import { caseStudySummary } from "./case-studies";
import type { WPCaseStudy, WPIndustry, WPPage, WPService } from "./types";

export const DEFAULT_SERVICE_CTA = {
  label: "Get your free audit",
  href: "#contact",
};

/** ACF FAQ repeater → Faq[] (answers are rich text). */
export function faqsFromFields(
  rows: { question: string; answer: string }[] | false | undefined
): Faq[] {
  if (!rows) return [];
  return rows
    .map((r) => ({
      question: htmlToText(r.question),
      answer: htmlToBlocks(r.answer).blocks,
    }))
    .filter((f) => f.question && f.answer.length);
}

/** Pull the first heading + following paragraph out as the hero; the rest is body. */

/* ── structured: service post type ───────────────────────────────── */

async function fromServiceType(
  entry: PathEntry,
  svc: WPService,
  opts: ReadOptions
): Promise<ServicePageModel> {
  const f = svc.acf ?? {};
  const hero = f.hero || {};
  const caseStudies = await getObjects<WPCaseStudy>(
    "case_study",
    relIds(f.related_case_studies),
    opts
  );
  const industries = await getObjects<WPIndustry>(
    "industry",
    relIds(f.industries),
    opts
  );
  return {
    kind: "service",
    id: svc.id,
    path: entry.path,
    title: title(svc),
    eyebrow: "Service",
    heroHeading: hero.headline ? htmlToText(hero.headline) : title(svc),
    heroIntro: hero.intro
      ? [{ type: "text", text: htmlToText(hero.intro) }]
      : [],
    heroImage: (await imageField(hero.image)) ?? featuredImage(svc),
    shortDescription: f.short_description
      ? htmlToText(f.short_description)
      : null,
    benefits: await Promise.all(
      (f.benefits || []).map(async (b) => ({
        title: htmlToText(b.title),
        body: htmlToText(b.body),
        image: await imageField(b.image),
      }))
    ),
    process: (f.process || []).map((p) => ({
      title: htmlToText(p.title),
      body: htmlToBlocks(p.body).blocks,
    })),
    body: htmlToBlocks(f.long_description ?? svc.content?.rendered).blocks,
    faqs: faqsFromFields(f.faqs),
    relatedCaseStudies: caseStudies.map(caseStudySummary),
    industries: industries.map((i) => ({
      name: title(i),
      path: pathFromLink(i.link),
    })),
    cta:
      f.cta && f.cta.label
        ? { label: f.cta.label, href: f.cta.url || DEFAULT_SERVICE_CTA.href }
        : DEFAULT_SERVICE_CTA,
    catalogueSlug: f.catalogue_slug || entry.catalogueSlug,
    seo: normalizeSeo(svc.yoast_head_json),
    source: "structured",
  };
}

/* ── legacy: existing Elementor page ─────────────────────────────── */

function fromLegacyPage(entry: PathEntry, page: WPPage): ServicePageModel {
  const { blocks, faqs } = htmlToBlocks(page.content?.rendered);
  const { heading, intro, body } = splitHero(
    blocks,
    title(page),
    page.yoast_head_json?.title
  );
  // Elementor tab widget on these pages is the delivery process.
  const stepsIdx = body.findIndex((b) => b.type === "steps");
  const steps = stepsIdx !== -1 ? body.splice(stepsIdx, 1)[0] : null;
  // The first group of Elementor image/icon boxes is the service feature list.
  const cardsIdx = body.findIndex((b) => b.type === "cards");
  const cards = cardsIdx !== -1 ? body.splice(cardsIdx, 1)[0] : null;
  return {
    kind: "service",
    id: page.id,
    path: entry.path,
    title: title(page),
    eyebrow: "Service",
    heroHeading: heading,
    heroIntro: intro,
    heroImage: featuredImage(page),
    shortDescription: null,
    benefits:
      cards && cards.type === "cards"
        ? cards.items.map((c) => ({
            title: c.title,
            body: inlineText(c.body),
            image: c.image,
          }))
        : [],
    process: steps && steps.type === "steps" ? steps.items : [],
    body,
    faqs,
    relatedCaseStudies: [],
    industries: [],
    cta: DEFAULT_SERVICE_CTA,
    catalogueSlug: entry.catalogueSlug,
    seo: normalizeSeo(page.yoast_head_json),
    source: "legacy",
  };
}

export async function getServicePage(
  entry: PathEntry,
  opts: ReadOptions = {}
): Promise<ServicePageModel | null> {
  if (entry.wpType === "service") {
    const svc = await getObject<WPService>("service", entry.id, opts);
    return svc ? fromServiceType(entry, svc, opts) : null;
  }
  const page = await getObject<WPPage>("page", entry.id, opts);
  return page ? fromLegacyPage(entry, page) : null;
}

/** All structured services (for the homepage adapter). [] until the type exists. */
export async function listServices(): Promise<WPService[]> {
  return listObjects<WPService>("service");
}
