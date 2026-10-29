import "server-only";

/**
 * Cheap first-line-of-defence per-IP rate limit for the careers API routes.
 * In-memory, so it only holds back a single serverless instance's share of
 * traffic — the authoritative limit lives in the WordPress plugin (a
 * transient-based counter against the one shared backend all instances
 * ultimately write through). This is defense-in-depth, not the real guard.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  // Bound memory on long-lived instances; a real cap belongs server-side.
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
