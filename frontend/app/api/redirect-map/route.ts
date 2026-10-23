import { NextResponse } from "next/server";
import { entriesOfKind, getPathIndex } from "@/lib/wordpress";

/**
 * Content-driven redirects for proxy.ts: previous paths, the WordPress
 * front-page slug, and /services/<slug>/ for services that live at a
 * root-level URL. Cached like the path index (tag "paths"), so the
 * WordPress save webhook refreshes it. Public data only (URLs).
 */
export const revalidate = 3600;

export async function GET() {
  try {
    const index = await getPathIndex();
    const map: Record<string, string> = { ...index.redirects };
    for (const svc of await entriesOfKind("service")) {
      const alias = `/services/${svc.slug}/`;
      if (svc.path !== alias && !index.entries.some((e) => e.path === alias)) {
        map[alias] = svc.path;
      }
    }
    return NextResponse.json({ redirects: map, source: index.source });
  } catch {
    // WordPress unavailable: no content redirects (static ones still apply).
    return NextResponse.json({ redirects: {}, source: "unavailable" });
  }
}
