import "server-only";
import type { LocationPageModel, PathEntry } from "@/types/content";
import { LEGACY_PAGE_KINDS } from "@/config/legacy-pages";
import { htmlToBlocks, htmlToText } from "./html-blocks";
import { getObject, getObjects, type ReadOptions } from "./objects";
import { normalizeSeo, pathFromLink, relIds, title } from "./normalize";
import { faqsFromFields, splitHero } from "./services";
import type { WPLocationPage, WPPage, WPService } from "./types";

async function fromLocationType(
  entry: PathEntry,
  loc: WPLocationPage,
  opts: ReadOptions
): Promise<LocationPageModel> {
  const f = loc.acf ?? {};
  const services = await getObjects<WPService>(
    "service",
    relIds(f.services_offered),
    opts
  );
  return {
    kind: "location",
    id: loc.id,
    path: entry.path,
    title: title(loc),
    city: f.city ?? null,
    heroHeading: title(loc),
    intro: f.intro ? [{ type: "text", text: htmlToText(f.intro) }] : [],
    servicesOffered: services.map((s) => ({
      name: title(s),
      path: s.acf?.public_path ?? pathFromLink(s.link),
    })),
    localProof: htmlToBlocks(f.local_proof).blocks,
    body: htmlToBlocks(loc.content?.rendered).blocks,
    faqs: faqsFromFields(f.faqs),
    seo: normalizeSeo(loc.yoast_head_json),
    source: "structured",
  };
}

function fromLegacyPage(entry: PathEntry, page: WPPage): LocationPageModel {
  const { blocks, faqs } = htmlToBlocks(page.content?.rendered);
  const { heading, intro, body } = splitHero(
    blocks,
    title(page),
    page.yoast_head_json?.title
  );
  return {
    kind: "location",
    id: page.id,
    path: entry.path,
    title: title(page),
    city: LEGACY_PAGE_KINDS[page.slug]?.city ?? null,
    heroHeading: heading,
    intro,
    servicesOffered: [],
    localProof: [],
    body,
    faqs,
    seo: normalizeSeo(page.yoast_head_json),
    source: "legacy",
  };
}

export async function getLocationPage(
  entry: PathEntry,
  opts: ReadOptions = {}
): Promise<LocationPageModel | null> {
  if (entry.wpType === "location_page") {
    const loc = await getObject<WPLocationPage>(
      "location_page",
      entry.id,
      opts
    );
    return loc ? fromLocationType(entry, loc, opts) : null;
  }
  const page = await getObject<WPPage>("page", entry.id, opts);
  return page ? fromLegacyPage(entry, page) : null;
}
