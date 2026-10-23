import "server-only";
import { cache } from "react";
import type {
  PathEntry,
  PathIndex,
  PathKind,
  Resolution,
} from "@/types/content";
import {
  DEFAULT_POSTS_PER_PAGE,
  LEGACY_PAGE_KINDS,
} from "@/config/legacy-pages";
import { normalizePath } from "@/lib/site";
import { isWordPressConfigured, wpFetch, wpFetchAll } from "./client";
import { TAG, TTL } from "./cache";
import { REST_BASE, pathFromLink, previousPaths, title } from "./normalize";
import type { WPObject, WPPathFields, WPPathIndexResponse } from "./types";

/**
 * Single source of truth for "which content lives at which URL".
 *
 * The site's pages and posts share the root URL namespace
 * (/seo-agency-in-nagpur/, /google-ads-vs-meta-ads/), so a route can't
 * know what a slug is without looking it up. This index answers that.
 *
 * Source order:
 *  1. mds/v1/paths  — the mu-plugin endpoint (one request, authoritative,
 *                     includes structured post types + previous paths)
 *  2. core REST     — built from wp/v2/pages, wp/v2/posts and any
 *                     structured post types that exist. This is what runs
 *                     today: nothing has to be installed on WordPress.
 */

const STRUCTURED_TYPES: { type: string; kind: PathKind }[] = [
  { type: "service", kind: "service" },
  { type: "location_page", kind: "location" },
  { type: "case_study", kind: "case-study" },
  { type: "industry", kind: "industry" },
  { type: "portfolio_project", kind: "portfolio" },
];

const KIND_BY_TYPE: Record<string, PathKind> = {
  page: "page",
  post: "post",
  service: "service",
  location_page: "location",
  case_study: "case-study",
  industry: "industry",
  portfolio_project: "portfolio",
};

const fetchOpts = { revalidate: TTL.paths, tags: [TAG.paths] };

function pageKind(
  slug: string,
  path: string
): { kind: PathKind; catalogueSlug: string | null } {
  if (path === "/") return { kind: "front-page", catalogueSlug: null };
  const legacy = LEGACY_PAGE_KINDS[slug];
  return legacy
    ? { kind: legacy.kind, catalogueSlug: legacy.catalogueSlug ?? null }
    : { kind: "page", catalogueSlug: null };
}

async function fromMdsEndpoint(): Promise<PathIndex | null> {
  const res = await wpFetch<WPPathIndexResponse>("mds/v1/paths", fetchOpts);
  if (!res || !Array.isArray(res.items)) return null;
  const entries: PathEntry[] = res.items.map((item) => {
    const path = normalizePath(item.path);
    const kind =
      (item.kind as PathKind) ??
      (item.type === "page"
        ? pageKind(item.slug, path).kind
        : (KIND_BY_TYPE[item.type] ?? "page"));
    return {
      path,
      kind,
      wpType: item.type,
      id: item.id,
      slug: item.slug,
      title: item.title,
      modified: item.modified ?? null,
      previousPaths: (item.previous_paths ?? []).map(normalizePath),
      catalogueSlug:
        item.catalogue_slug ??
        (item.type === "page" ? pageKind(item.slug, path).catalogueSlug : null),
      noindex: item.noindex ?? false,
    };
  });
  return finalize(
    entries,
    "mds-endpoint",
    res.posts_per_page,
    res.blog_index_path
  );
}

async function fromCoreRest(): Promise<PathIndex> {
  const fields = "id,slug,link,title,modified,type,acf,yoast_head_json.robots";
  // One request tells us which structured types are registered, instead of
  // probing each REST route (slow shared hosting times out on 404 probes).
  const registered = await wpFetch<Record<string, { slug: string }>>(
    "wp/v2/types",
    fetchOpts
  );
  const present = STRUCTURED_TYPES.filter((t) => registered?.[t.type]);

  const [pages, posts, ...structured] = await Promise.all([
    wpFetchAll<WPObject>("wp/v2/pages", {
      ...fetchOpts,
      searchParams: { _fields: fields },
    }),
    wpFetchAll<WPObject>("wp/v2/posts", {
      ...fetchOpts,
      searchParams: { _fields: fields },
    }),
    ...present.map((t) =>
      wpFetchAll<WPObject & { acf?: WPPathFields }>(
        `wp/v2/${REST_BASE[t.type]}`,
        {
          ...fetchOpts,
          searchParams: { _fields: fields },
        }
      )
    ),
  ]);

  const entries: PathEntry[] = [];
  for (const p of pages) {
    const path = pathFromLink(p.link);
    if (!path) continue;
    const { kind, catalogueSlug } = pageKind(p.slug, path);
    entries.push({
      path,
      kind,
      wpType: "page",
      id: p.id,
      slug: p.slug,
      title: title(p),
      modified: p.modified ?? null,
      // WordPress 301s the front page's own slug to "/". Preserve that.
      previousPaths: kind === "front-page" ? [`/${p.slug}/`] : [],
      catalogueSlug,
      noindex: p.yoast_head_json?.robots?.index === "noindex",
    });
  }
  for (const p of posts) {
    const path = pathFromLink(p.link);
    if (!path) continue;
    entries.push({
      path,
      kind: "post",
      wpType: "post",
      id: p.id,
      slug: p.slug,
      title: title(p),
      modified: p.modified ?? null,
      previousPaths: [],
      catalogueSlug: null,
      noindex: p.yoast_head_json?.robots?.index === "noindex",
    });
  }
  structured.forEach((items, i) => {
    const { type, kind } = present[i];
    for (const item of items as (WPObject & {
      acf?: WPPathFields & { catalogue_slug?: string };
    })[]) {
      const path = item.acf?.public_path
        ? normalizePath(item.acf.public_path)
        : pathFromLink(item.link);
      if (!path) continue;
      entries.push({
        path,
        kind,
        wpType: type,
        id: item.id,
        slug: item.slug,
        title: title(item),
        modified: item.modified ?? null,
        previousPaths: previousPaths(item.acf?.previous_paths),
        catalogueSlug: item.acf?.catalogue_slug ?? null,
        noindex: item.yoast_head_json?.robots?.index === "noindex",
      });
    }
  });
  return finalize(entries, "core-rest");
}

function finalize(
  raw: PathEntry[],
  source: PathIndex["source"],
  postsPerPage?: number,
  blogIndexPath?: string | null
): PathIndex {
  // One entry per path. A structured post type that claims a legacy page's
  // path supersedes that page (that's how Phase 6 migrates a page in place).
  const priority = (e: PathEntry) =>
    e.wpType === "page" || e.wpType === "post" ? 0 : 1;
  const byPath = new Map<string, PathEntry>();
  for (const e of raw) {
    const prev = byPath.get(e.path);
    if (!prev || priority(e) > priority(prev)) byPath.set(e.path, e);
  }
  const entries = [...byPath.values()];

  // previous → current, never shadowing a live URL, never self-referencing.
  const redirects: Record<string, string> = {};
  for (const e of entries) {
    for (const prev of e.previousPaths) {
      if (prev !== e.path && !byPath.has(prev)) redirects[prev] = e.path;
    }
  }
  // Collapse chains (a→b→c becomes a→c) and drop cycles.
  for (const from of Object.keys(redirects)) {
    let to = redirects[from];
    const seen = new Set([from]);
    while (redirects[to] && !seen.has(to)) {
      seen.add(to);
      to = redirects[to];
    }
    if (seen.has(to)) delete redirects[from];
    else redirects[from] = to;
  }

  const blog = blogIndexPath
    ? normalizePath(blogIndexPath)
    : (entries.find((e) => e.kind === "blog-index")?.path ?? null);
  return {
    entries,
    redirects,
    blogIndexPath: blog,
    postsPerPage: postsPerPage || DEFAULT_POSTS_PER_PAGE,
    source,
  };
}

/**
 * The index. Deduplicated per request; cached across requests by the
 * tagged fetches (24h, "paths"). Throws only if WordPress is configured
 * but unreachable, so callers never mistake an outage for "no such page".
 */
export const getPathIndex = cache(async (): Promise<PathIndex> => {
  if (!isWordPressConfigured()) {
    return {
      entries: [],
      redirects: {},
      blogIndexPath: null,
      postsPerPage: DEFAULT_POSTS_PER_PAGE,
      source: "unavailable",
    };
  }
  return (await fromMdsEndpoint()) ?? (await fromCoreRest());
});

/** Resolve a request path to content, a 301 target, or not-found. */
export async function resolvePath(requestPath: string): Promise<Resolution> {
  const index = await getPathIndex();
  const path = normalizePath(requestPath);
  const entry = index.entries.find((e) => e.path === path);
  if (entry) {
    // Same content, different spelling (e.g. upper-case): one canonical URL.
    if (
      entry.path !== requestPath &&
      requestPath.toLowerCase() === entry.path
    ) {
      return { type: "redirect", to: entry.path };
    }
    return entry.kind === "front-page"
      ? { type: "redirect", to: "/" }
      : { type: "entry", entry };
  }
  const to = index.redirects[path];
  return to ? { type: "redirect", to } : { type: "not-found" };
}

/** Entries of one kind, e.g. every service page for the /services/ hub. */
export async function entriesOfKind(kind: PathKind): Promise<PathEntry[]> {
  const index = await getPathIndex();
  return index.entries.filter((e) => e.kind === kind);
}

export async function entryById(
  wpType: string,
  id: number
): Promise<PathEntry | null> {
  const index = await getPathIndex();
  return index.entries.find((e) => e.wpType === wpType && e.id === id) ?? null;
}
