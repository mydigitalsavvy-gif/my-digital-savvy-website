import "server-only";

/**
 * Minimal fetch layer for the MDS Careers WordPress plugin's REST routes
 * (mds-careers/v1/*). Deliberately separate from lib/wordpress/client.ts
 * and its WORDPRESS_API_URL:
 *
 *  - Careers must not be entangled with the sitewide WordPress cutover
 *    switch other content types (services, case studies, blog, legacy
 *    pages) are still waiting on — setting WORDPRESS_CAREERS_API_URL turns
 *    on live jobs/applications without touching anything else.
 *  - Every job always has a static fallback (lib/careers/static-jobs.ts),
 *    so unlike lib/wordpress/client.ts there is no "page would 404 if we
 *    returned null on an outage" SEO risk to guard against by throwing —
 *    any failure here can degrade straight to the static list.
 */

const CAREERS_API_URL = process.env.WORDPRESS_CAREERS_API_URL?.trim() || "";
const TIMEOUT_MS = 8_000;

export function isCareersWordPressConfigured(): boolean {
  return CAREERS_API_URL !== "";
}

function buildUrl(path: string): string {
  const base = CAREERS_API_URL.endsWith("/")
    ? CAREERS_API_URL
    : `${CAREERS_API_URL}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
}

/** Single resource or list. null = not configured, not found, or unreachable (caller falls back to static). */
export async function careersFetch<T>(
  path: string,
  opts: { revalidate?: number; tags?: string[] } = {}
): Promise<T | null> {
  if (!CAREERS_API_URL) return null;
  try {
    const res = await fetch(buildUrl(path), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: opts.revalidate ?? 300, tags: opts.tags },
    });
    if (!res.ok) {
      if (res.status !== 404) {
        console.error(
          `[careers] ${res.status} ${res.statusText} for ${path}`
        );
      }
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[careers] request failed for ${path}:`, error);
    return null;
  }
}

/**
 * Write path (application/partnership submission). Separate from reads:
 * authenticated with MDS_CAREERS_SECRET, never cached, and the caller
 * needs to distinguish "not configured" from "WordPress rejected it" from
 * "network failure" to answer the candidate honestly.
 */
export type CareersWriteResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not-configured" }
  | { ok: false; reason: "unreachable" }
  | { ok: false; reason: "rejected"; status: number; message?: string };

export async function careersWrite<T>(
  path: string,
  body: FormData
): Promise<CareersWriteResult<T>> {
  const secret = process.env.MDS_CAREERS_SECRET?.trim() || "";
  if (!CAREERS_API_URL || !secret) return { ok: false, reason: "not-configured" };

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: "POST",
      headers: { "X-MDS-Careers-Secret": secret },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[careers] write failed for ${path}:`, error);
    return { ok: false, reason: "unreachable" };
  }

  if (!res.ok) {
    let message: string | undefined;
    try {
      const body = (await res.json()) as { message?: string };
      message = body?.message;
    } catch {
      /* non-JSON error body */
    }
    return { ok: false, reason: "rejected", status: res.status, message };
  }

  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, reason: "rejected", status: 502, message: "Invalid response" };
  }
}
