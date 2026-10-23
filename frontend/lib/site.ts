/**
 * Public site origin and URL helpers. WordPress links (absolute, on the
 * CMS host or the current live host) are converted to site-relative paths
 * so every internal link and canonical points at the Next.js site.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mydigitalsavvy.com"
).replace(/\/$/, "");

/** Hosts whose links are "ours": the public site, the live WP host and the CMS host. */
function internalHosts(): Set<string> {
  const hosts = new Set<string>([
    "mydigitalsavvy.com",
    "www.mydigitalsavvy.com",
  ]);
  for (const raw of [
    SITE_URL,
    process.env.WORDPRESS_API_URL,
    process.env.WORDPRESS_MEDIA_ORIGIN,
  ]) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).host);
    } catch {
      /* ignore malformed env */
    }
  }
  return hosts;
}

/** Ensures "/a/b" → "/a/b/" and "" → "/". Leaves files (with an extension) alone. */
export function withTrailingSlash(path: string): string {
  if (!path || path === "/") return "/";
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (/\.[a-z0-9]{2,5}$/i.test(clean) || clean.endsWith("/")) return clean;
  return `${clean}/`;
}

/** Normalizes a request path for index lookups: lowercase, single slashes, trailing slash. */
export function normalizePath(path: string): string {
  let p = decodeURIComponent(path.split("?")[0].split("#")[0]);
  p = p.replace(/\/{2,}/g, "/").toLowerCase();
  return withTrailingSlash(p);
}

/**
 * If `href` points at one of our hosts, return its site-relative path
 * (with query/hash preserved). Otherwise null.
 */
export function toInternalPath(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const u = new URL(href);
    if (!internalHosts().has(u.host)) return null;
    if (
      u.pathname.startsWith("/wp-content/") ||
      u.pathname.startsWith("/wp-json/")
    ) {
      return null; // media and API stay absolute
    }
    return withTrailingSlash(u.pathname) + u.search + u.hash;
  } catch {
    return null;
  }
}

/** Absolute public URL for a site path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${withTrailingSlash(path)}`;
}

/** Rewrites a WordPress/Yoast absolute URL onto the public origin (canonicals, og:url). */
export function toPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const internal = toInternalPath(url);
  if (internal === null) return url;
  return `${SITE_URL}${internal}`;
}
