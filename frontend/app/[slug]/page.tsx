import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { getPathIndex, resolvePath } from "@/lib/wordpress";
import { entryMetadata, renderEntry } from "@/lib/content/entries";
import { PreviewBar } from "@/components/content/PreviewBar";
import { CONTENT_REVIEW_PATHS } from "@/config/content-review";

/**
 * Every existing root-level WordPress URL: service landing pages
 * (/seo-agency-in-nagpur/), city pages, blog posts (/google-ads-vs-meta-ads/),
 * the blog index and plain pages. The URL never changes; the path index
 * decides which typed view renders it.
 *
 * Known URLs are prerendered at build and refreshed by cache tags; new
 * WordPress content renders on first request (dynamicParams).
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const index = await getPathIndex();
    return index.entries
      .filter(
        (e) =>
          e.kind !== "front-page" &&
          !CONTENT_REVIEW_PATHS.has(e.path) &&
          /^\/[^/]+\/$/.test(e.path)
      )
      .map((e) => ({ slug: e.path.slice(1, -1) }));
  } catch (error) {
    // CMS down at build: nothing prerendered, everything renders on demand.
    console.error("[build] path index unavailable, skipping prerender:", error);
    return [];
  }
}

async function resolve(slug: string) {
  return resolvePath(`/${slug}/`);
}

export async function generateMetadata(
  props: PageProps<"/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await resolve(slug);
  if (res.type !== "entry") return {};
  const { isEnabled } = await draftMode();
  return entryMetadata(res.entry, { draft: isEnabled, noindex: isEnabled });
}

export default async function LegacyRoute(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const res = await resolve(slug);
  if (res.type === "redirect") permanentRedirect(res.to);
  if (res.type === "not-found") notFound();
  // CONTENT_REVIEW_REQUIRED pages are served by the WordPress passthrough
  // rewrite (next.config.ts) and are never rebuilt from CMS data.
  if (CONTENT_REVIEW_PATHS.has(res.entry.path)) notFound();

  const { isEnabled: draft } = await draftMode();
  const view = await renderEntry(res.entry, { draft });
  if (!view) notFound();
  return (
    <>
      {view}
      {draft ? <PreviewBar path={res.entry.path} /> : null}
    </>
  );
}
