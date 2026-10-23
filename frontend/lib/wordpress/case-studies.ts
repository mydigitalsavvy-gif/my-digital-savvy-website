import "server-only";
import type {
  CaseStudyMetric,
  CaseStudyModel,
  CaseStudySummary,
  PathEntry,
} from "@/types/content";
import { htmlToBlocks, htmlToText } from "./html-blocks";
import {
  getObject,
  getObjects,
  listObjects,
  type ReadOptions,
} from "./objects";
import {
  imageField,
  normalizeSeo,
  pathFromLink,
  relIds,
  title,
} from "./normalize";
import { normalizeTestimonial } from "./testimonials";
import type {
  WPCaseStudy,
  WPIndustry,
  WPService,
  WPTestimonial,
} from "./types";

export function caseStudySummary(cs: WPCaseStudy): CaseStudySummary {
  return {
    id: cs.id,
    path:
      cs.acf?.public_path ??
      pathFromLink(cs.link) ??
      `/case-studies/${cs.slug}/`,
    title: title(cs),
    clientName: cs.acf?.client_name ?? null,
    industry: null,
  };
}

/**
 * A metric only counts as proof when it names its source. Anything
 * unsourced is dropped here, so a component can never present it as a
 * verified result.
 */
export function verifiedMetrics(
  rows: NonNullable<WPCaseStudy["acf"]>["metrics"]
): CaseStudyMetric[] {
  if (!rows) return [];
  return rows
    .map((m) => ({
      label: htmlToText(m.label),
      value: htmlToText(m.value),
      period: m.period ? htmlToText(m.period) : null,
      source: m.source ? htmlToText(m.source) : null,
      verified: Boolean(m.source && m.source.trim()),
    }))
    .filter((m) => m.label && m.value && m.verified);
}

export async function getCaseStudy(
  entry: PathEntry,
  opts: ReadOptions = {}
): Promise<CaseStudyModel | null> {
  const cs = await getObject<WPCaseStudy>("case_study", entry.id, opts);
  if (!cs) return null;
  const f = cs.acf ?? {};
  const [industry] = await getObjects<WPIndustry>(
    "industry",
    relIds(f.industry),
    opts
  );
  const services = await getObjects<WPService>(
    "service",
    relIds(f.services),
    opts
  );
  const [testimonial] = await getObjects<WPTestimonial>(
    "testimonial",
    relIds(f.testimonial),
    opts
  );
  const gallery = (
    await Promise.all((f.gallery || []).map((g) => imageField(g)))
  ).filter((g): g is NonNullable<typeof g> => g !== null);
  return {
    kind: "case-study",
    ...caseStudySummary(cs),
    path: entry.path,
    industry: industry ? title(industry) : null,
    challenge: htmlToBlocks(f.challenge).blocks,
    strategy: htmlToBlocks(f.strategy).blocks,
    execution: htmlToBlocks(f.execution).blocks,
    results: htmlToBlocks(f.results).blocks,
    metrics: verifiedMetrics(f.metrics),
    gallery,
    testimonial: testimonial ? await normalizeTestimonial(testimonial) : null,
    services: services.map((s) => ({
      name: title(s),
      path: s.acf?.public_path ?? pathFromLink(s.link),
    })),
    date: cs.date ?? null,
    seo: normalizeSeo(cs.yoast_head_json),
  };
}

export async function listCaseStudies(): Promise<CaseStudySummary[]> {
  return (await listObjects<WPCaseStudy>("case_study")).map(caseStudySummary);
}
