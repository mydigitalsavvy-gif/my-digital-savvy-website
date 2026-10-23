import { NextResponse, type NextRequest } from "next/server";
import { staticRedirectFor } from "@/config/redirects";

/**
 * Legacy URL normalisation: every redirect is ONE 301 to the final URL.
 *
 *   1. trailing slash added (WordPress URLs all end in "/")
 *   2. path lowercased (WordPress matched slugs case-insensitively)
 *   3. static legacy redirects (config/redirects.ts)
 *   4. content redirects from the path index (/api/redirect-map/)
 *
 * Steps compose before responding, so /SEO-Agency-In-Nagpur becomes a single
 * 301 to /seo-agency-in-nagpur/, never a chain. Only GET/HEAD are redirected
 * (webhooks keep their method). Files, /_next and /api are untouched.
 */

const MAP_TTL_MS = 60_000;
let cached: { at: number; map: Record<string, string> } | null = null;

async function contentRedirects(
  origin: string
): Promise<Record<string, string>> {
  if (cached && Date.now() - cached.at < MAP_TTL_MS) return cached.map;
  try {
    const res = await fetch(`${origin}/api/redirect-map/`, {
      headers: { accept: "application/json" },
    });
    const json = (await res.json()) as { redirects?: Record<string, string> };
    cached = { at: Date.now(), map: json.redirects ?? {} };
  } catch {
    cached = { at: Date.now(), map: cached?.map ?? {} };
  }
  return cached.map;
}

export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD")
    return NextResponse.next();
  const { pathname, search, origin } = request.nextUrl;

  const isFile = /\.[a-z0-9]{2,5}$/i.test(pathname);
  let path = pathname.replace(/\/{2,}/g, "/");
  if (!isFile && !path.endsWith("/")) path += "/";
  if (/[A-Z]/.test(path) && !isFile) path = path.toLowerCase();

  const target =
    staticRedirectFor(path) ??
    staticRedirectFor(path.toLowerCase()) ??
    (isFile ? null : (await contentRedirects(origin))[path]) ??
    path;

  if (target === pathname) return NextResponse.next();
  // A plain URL, not nextUrl.clone(): NextURL re-formats the pathname and
  // drops the trailing slash, which would loop. Query strings survive
  // normalisation (e.g. ?utm_*), but not content redirects.
  const url = new URL(target, origin);
  url.search = target === path ? search : "";
  return NextResponse.redirect(url.toString(), 301);
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon\\.ico$|icon\\.png$|apple-icon\\.png$|apple-touch-icon\\.png$|apple-touch-icon-precomposed\\.png$).*)"],
};
