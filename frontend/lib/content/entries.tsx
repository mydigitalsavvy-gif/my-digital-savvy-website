import "server-only";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { ArchiveModel, PathEntry } from "@/types/content";
import {
  getCaseStudy,
  getGenericPage,
  getIndustry,
  getLocationPage,
  getPageSeo,
  getPathIndex,
  getPost,
  getServicePage,
  getYoastHead,
  pagedSeo,
  listPosts,
} from "@/lib/wordpress";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/site";
import { blocksToText, inlinesToText, summarize } from "@/lib/content/text";
import { ServiceView } from "@/components/content/views/ServiceView";
import { LocationView } from "@/components/content/views/LocationView";
import { PostView } from "@/components/content/views/PostView";
import { ArchiveView } from "@/components/content/views/ArchiveView";
import {
  CaseStudyView,
  GenericPageView,
  IndustryView,
} from "@/components/content/views/SimpleViews";

/**
 * Entry → view + metadata. Used by every content route (root-level
 * legacy URLs, /services/*, /case-studies/*, /industries/*, previews) so
 * they all render and describe content the same way.
 */

export interface LoadOptions {
  draft?: boolean;
}

export async function blogPath(): Promise<string> {
  return (await getPathIndex()).blogIndexPath ?? "/blog/";
}

/** Blog index archive for page N (the WordPress "posts page"). */
export async function blogArchive(
  entry: PathEntry | null,
  page: number
): Promise<ArchiveModel | null> {
  const index = await getPathIndex();
  const list = await listPosts({ page, perPage: index.postsPerPage });
  if (page > 1 && !list.posts.length) return null;
  const basePath = entry?.path ?? "/blog/";
  const first = entry ? await getPageSeo(entry) : null;
  const pagedPath = `${basePath}page/${page}/`;
  const seo =
    page > 1
      ? ((await getYoastHead(pagedPath)) ??
        pagedSeo(first, {
          canonical: absoluteUrl(pagedPath),
          page,
          totalPages: list.totalPages,
          insertPageInTitle: false,
        }))
      : first;
  return {
    kind: "blog-index",
    title: entry?.title || "Blog",
    label: "Insights · From the blog",
    basePath,
    list,
    seo,
  };
}

/** Render the view for an entry. null → the content doesn't exist (route calls notFound). */
export async function renderEntry(
  entry: PathEntry,
  opts: LoadOptions = {}
): Promise<ReactNode | null> {
  switch (entry.kind) {
    case "service": {
      const model = await getServicePage(entry, opts);
      return model ? <ServiceView model={model} /> : null;
    }
    case "location": {
      const model = await getLocationPage(entry, opts);
      return model ? <LocationView model={model} /> : null;
    }
    case "post": {
      const model = await getPost(entry, opts);
      return model ? (
        <PostView model={model} blogPath={await blogPath()} />
      ) : null;
    }
    case "blog-index": {
      const model = await blogArchive(entry, 1);
      return model ? <ArchiveView model={model} blogPath={entry.path} /> : null;
    }
    case "case-study": {
      const model = await getCaseStudy(entry, opts);
      return model ? <CaseStudyView model={model} /> : null;
    }
    case "industry": {
      const model = await getIndustry(entry, opts);
      return model ? <IndustryView model={model} /> : null;
    }
    case "page": {
      const model = await getGenericPage(entry, opts);
      return model ? <GenericPageView model={model} /> : null;
    }
    default:
      return null;
  }
}

/** Metadata for an entry, from Yoast first. Same cached fetches as renderEntry. */
/**
 * Metadata for an entry. Structured post types that took over a legacy
 * URL via public_path always canonicalise to that public URL, even if
 * Yoast computed the canonical from the post type permalink
 * (/services/...). Pages and posts keep the Yoast canonical untouched.
 */
export async function entryMetadata(
  entry: PathEntry,
  opts: LoadOptions & { noindex?: boolean } = {}
): Promise<Metadata> {
  const meta = await yoastEntryMetadata(entry, opts);
  if (entry.wpType === "page" || entry.wpType === "post") return meta;
  const url = absoluteUrl(entry.path);
  return {
    ...meta,
    alternates: { ...meta.alternates, canonical: url },
    openGraph: meta.openGraph ? { ...meta.openGraph, url } : meta.openGraph,
  };
}

async function yoastEntryMetadata(
  entry: PathEntry,
  opts: LoadOptions & { noindex?: boolean } = {}
): Promise<Metadata> {
  const base = { path: entry.path, title: entry.title, noindex: opts.noindex };
  switch (entry.kind) {
    case "service": {
      const m = await getServicePage(entry, opts);
      return buildMetadata(m?.seo ?? null, {
        ...base,
        description:
          m?.shortDescription ?? summarize(inlinesToText(m?.heroIntro ?? [])),
        image: m?.heroImage,
      });
    }
    case "location": {
      const m = await getLocationPage(entry, opts);
      return buildMetadata(m?.seo ?? null, {
        ...base,
        description: summarize(inlinesToText(m?.intro ?? [])),
      });
    }
    case "post": {
      const m = await getPost(entry, opts);
      return buildMetadata(m?.seo ?? null, {
        ...base,
        description: m?.excerpt,
        image: m?.image,
        type: "article",
        publishedTime: m?.date,
        modifiedTime: m?.modified,
      });
    }
    case "blog-index": {
      const m = await blogArchive(entry, 1);
      return buildMetadata(m?.seo ?? null, base);
    }
    case "case-study": {
      const m = await getCaseStudy(entry, opts);
      return buildMetadata(m?.seo ?? null, {
        ...base,
        type: "article",
        image: m?.gallery[0],
      });
    }
    case "industry": {
      const m = await getIndustry(entry, opts);
      return buildMetadata(m?.seo ?? null, {
        ...base,
        description: summarize(blocksToText(m?.intro ?? [])),
      });
    }
    default: {
      const m = await getGenericPage(entry, opts);
      return buildMetadata(m?.seo ?? null, {
        ...base,
        description: summarize(blocksToText(m?.body ?? [])),
      });
    }
  }
}
