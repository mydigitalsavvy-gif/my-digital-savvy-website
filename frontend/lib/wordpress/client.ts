import "server-only";

/**
 * Base fetch layer for the WordPress REST API. Every module in
 * lib/wordpress/* goes through here; nothing else calls WordPress.
 *
 * Error contract (important for SEO):
 *  - WORDPRESS_API_URL unset      → returns null quietly (local dev / static fallback)
 *  - 404                          → returns null ("content genuinely does not exist")
 *  - network error / 5xx / timeout → throws WordPressUnavailableError
 *
 * Throwing on outages is deliberate. Returning null would make a ranking
 * URL answer 404 whenever the CMS blips, telling Google the page is gone.
 * A thrown error during ISR revalidation keeps the last good page cached;
 * on a cold request it renders the error boundary with a 500 instead.
 */

const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL?.trim() || "";
const PREVIEW_USER = process.env.WORDPRESS_PREVIEW_USER?.trim() || "";
const PREVIEW_PASSWORD =
  process.env.WORDPRESS_PREVIEW_APP_PASSWORD?.trim() || "";
const TIMEOUT_MS = 10_000;
/** Shared hosting answers 500s to bursts (seen during builds); cap in-flight requests per process. */
const MAX_CONCURRENT = 4;
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [400, 1500];

export class WordPressAPIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "WordPressAPIError";
    this.status = status;
  }
}

/** The CMS is configured but unreachable or erroring. */
export class WordPressUnavailableError extends WordPressAPIError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = "WordPressUnavailableError";
  }
}

export interface WPFetchOptions {
  searchParams?: Record<string, string | number | boolean | undefined>;
  /** Seconds before the cached response is considered stale. */
  revalidate?: number;
  /** Cache tags for on-demand revalidation (see lib/wordpress/cache.ts). */
  tags?: string[];
  /** Draft/preview read: authenticated, never cached. Server-only credentials. */
  draft?: boolean;
}

export function isWordPressConfigured(): boolean {
  return WORDPRESS_API_URL !== "";
}

/** Origin of the WordPress install, e.g. https://cms.mydigitalsavvy.com */
export function wordpressOrigin(): string | null {
  if (!WORDPRESS_API_URL) return null;
  try {
    return new URL(WORDPRESS_API_URL).origin;
  } catch {
    return null;
  }
}

export function hasPreviewCredentials(): boolean {
  return PREVIEW_USER !== "" && PREVIEW_PASSWORD !== "";
}

function buildUrl(path: string, searchParams?: WPFetchOptions["searchParams"]) {
  const base = WORDPRESS_API_URL.endsWith("/")
    ? WORDPRESS_API_URL
    : `${WORDPRESS_API_URL}/`;
  const url = new URL(path.replace(/^\//, ""), base);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url;
}

let inFlight = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_CONCURRENT)
    await new Promise<void>((resolve) => queue.push(resolve));
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    queue.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with a concurrency slot and short backoff retries for transient failures. */
async function fetchWithRetry(
  url: string,
  init: RequestInit
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await withSlot(() =>
        fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
      );
      if (!RETRY_STATUS.has(res.status) || attempt >= RETRY_DELAYS_MS.length)
        return res;
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) throw error;
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

interface RawResponse<T> {
  data: T;
  total: number | null;
  totalPages: number | null;
}

async function request<T>(
  path: string,
  options: WPFetchOptions
): Promise<RawResponse<T> | null> {
  if (!WORDPRESS_API_URL) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[wordpress] WORDPRESS_API_URL is not set — returning null for "${path}"`
      );
    }
    return null;
  }

  const url = buildUrl(path, options.searchParams);
  const headers: Record<string, string> = { Accept: "application/json" };
  const init: RequestInit & { next?: NextFetchRequestConfig } = { headers };

  if (options.draft) {
    if (hasPreviewCredentials()) {
      headers.Authorization =
        "Basic " +
        Buffer.from(`${PREVIEW_USER}:${PREVIEW_PASSWORD}`).toString("base64");
    }
    init.cache = "no-store";
  } else {
    init.next = { revalidate: options.revalidate ?? 3600, tags: options.tags };
  }

  let res: Response;
  try {
    res = await fetchWithRetry(url.toString(), init);
  } catch (error) {
    console.error(
      `[wordpress] request failed for ${url.pathname}${url.search}:`,
      error
    );
    throw new WordPressUnavailableError(`WordPress request failed for ${path}`);
  }

  if (res.status === 404) return null;
  // An unknown REST route (e.g. a custom post type that isn't registered
  // yet) is "no such content", not an outage.
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    if (!options.draft) return null;
    throw new WordPressAPIError(
      `WordPress refused ${path} (${res.status})`,
      res.status
    );
  }
  if (!res.ok) {
    console.error(
      `[wordpress] ${res.status} ${res.statusText} for ${url.pathname}${url.search}`
    );
    throw new WordPressUnavailableError(
      `WordPress responded with ${res.status} for ${path}`,
      res.status
    );
  }

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new WordPressUnavailableError(
      `WordPress returned invalid JSON for ${path}`
    );
  }
  const num = (h: string) => {
    const v = res.headers.get(h);
    return v === null ? null : Number(v);
  };
  return { data, total: num("X-WP-Total"), totalPages: num("X-WP-TotalPages") };
}

/** Single resource. null = not configured or 404. Throws on outage. */
export async function wpFetch<T>(
  path: string,
  options: WPFetchOptions = {}
): Promise<T | null> {
  const res = await request<T>(path, options);
  return res ? res.data : null;
}

/** List resource. [] = not configured or 404. Throws on outage. */
export async function wpFetchList<T>(
  path: string,
  options: WPFetchOptions = {}
): Promise<T[]> {
  const res = await request<T[]>(path, options);
  return res && Array.isArray(res.data) ? res.data : [];
}

/** List resource with WordPress pagination headers. */
export async function wpFetchPaged<T>(
  path: string,
  options: WPFetchOptions = {}
): Promise<{ items: T[]; total: number; totalPages: number }> {
  const res = await request<T[]>(path, options);
  if (!res || !Array.isArray(res.data))
    return { items: [], total: 0, totalPages: 0 };
  return {
    items: res.data,
    total: res.total ?? res.data.length,
    totalPages: res.totalPages ?? 1,
  };
}

/** Every page of a list endpoint (per_page=100), for indexes and sitemaps. */
export async function wpFetchAll<T>(
  path: string,
  options: WPFetchOptions = {}
): Promise<T[]> {
  const first = await wpFetchPaged<T>(path, {
    ...options,
    searchParams: { ...options.searchParams, per_page: 100, page: 1 },
  });
  const all = [...first.items];
  for (let page = 2; page <= Math.min(first.totalPages, 50); page++) {
    const next = await wpFetchPaged<T>(path, {
      ...options,
      searchParams: { ...options.searchParams, per_page: 100, page },
    });
    all.push(...next.items);
  }
  return all;
}
