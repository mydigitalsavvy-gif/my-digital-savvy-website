import "server-only";
import type { IndustryModel, PathEntry } from "@/types/content";
import { htmlToBlocks, htmlToText } from "./html-blocks";
import { getObject, getObjects, type ReadOptions } from "./objects";
import { normalizeSeo, pathFromLink, relIds, title } from "./normalize";
import { caseStudySummary } from "./case-studies";
import type { WPCaseStudy, WPIndustry, WPService } from "./types";

export async function getIndustry(
  entry: PathEntry,
  opts: ReadOptions = {}
): Promise<IndustryModel | null> {
  const ind = await getObject<WPIndustry>("industry", entry.id, opts);
  if (!ind) return null;
  const f = ind.acf ?? {};
  const services = await getObjects<WPService>(
    "service",
    relIds(f.services),
    opts
  );
  const caseStudies = await getObjects<WPCaseStudy>(
    "case_study",
    relIds(f.case_studies),
    opts
  );
  return {
    kind: "industry",
    id: ind.id,
    path: entry.path,
    title: title(ind),
    intro: htmlToBlocks(f.intro ?? ind.content?.rendered).blocks,
    painPoints: (f.pain_points || []).map((p) => ({
      title: htmlToText(p.title),
      body: htmlToText(p.body),
    })),
    services: services.map((s) => ({
      name: title(s),
      path: s.acf?.public_path ?? pathFromLink(s.link),
    })),
    caseStudies: caseStudies.map(caseStudySummary),
    seo: normalizeSeo(ind.yoast_head_json),
  };
}
