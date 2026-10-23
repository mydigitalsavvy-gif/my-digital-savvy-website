import "server-only";
import type { GenericPageModel, PathEntry } from "@/types/content";
import { htmlToBlocks } from "./html-blocks";
import { getObject, type ReadOptions } from "./objects";
import { normalizeSeo, title } from "./normalize";
import type { WPPage } from "./types";

/** Any WordPress page without a dedicated template (e.g. /thank-you/). */
export async function getGenericPage(
  entry: PathEntry,
  opts: ReadOptions = {}
): Promise<GenericPageModel | null> {
  const page = await getObject<WPPage>("page", entry.id, opts);
  if (!page) return null;
  return {
    kind: "page",
    id: page.id,
    path: entry.path,
    title: title(page),
    body: htmlToBlocks(page.content?.rendered).blocks,
    seo: normalizeSeo(page.yoast_head_json),
  };
}

/** The blog index page's own Yoast data (title/description of /my-digital-savvy-blog/). */
export async function getPageSeo(entry: PathEntry) {
  const page = await getObject<WPPage>("page", entry.id);
  return page ? normalizeSeo(page.yoast_head_json) : null;
}
