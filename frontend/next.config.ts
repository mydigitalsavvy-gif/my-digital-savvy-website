import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import { CONTENT_REVIEW } from "./config/content-review";

/**
 * WordPress hosts that may serve images: the live site today, and the
 * CMS host after cutover (WORDPRESS_API_URL / WORDPRESS_MEDIA_ORIGIN).
 */
function wordpressHosts(): string[] {
  const hosts = new Set(["mydigitalsavvy.com", "www.mydigitalsavvy.com"]);
  for (const raw of [
    process.env.WORDPRESS_API_URL,
    process.env.WORDPRESS_MEDIA_ORIGIN,
  ]) {
    if (!raw) continue;
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      /* ignore malformed env */
    }
  }
  return [...hosts];
}

const remotePatterns: RemotePattern[] = wordpressHosts().flatMap((hostname) =>
  (["https", "http"] as const).map((protocol) => ({
    protocol,
    hostname,
    pathname: "/wp-content/uploads/**",
  }))
);

/** After cutover WordPress lives on the CMS host; old /wp-content/uploads/ URLs keep working through Next. */
const mediaOrigin = process.env.WORDPRESS_MEDIA_ORIGIN?.replace(/\/$/, "");

/** WordPress frontend origin (the API host). CONTENT_REVIEW_REQUIRED pages are served from it unchanged. */
const wordpressFrontend = (() => {
  try {
    return process.env.WORDPRESS_API_URL
      ? new URL(process.env.WORDPRESS_API_URL).origin
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // The live WordPress site serves every URL with a trailing slash.
  // Matching it keeps existing ranking URLs identical after migration.
  trailingSlash: true,
  // proxy.ts adds the slash itself so slash + case + legacy redirects are one 301.
  skipTrailingSlashRedirect: true,

  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
  },

  async rewrites() {
    return {
      beforeFiles: [
        // WordPress shortlinks: /?p=123 and /?page_id=123 → 301 to the permalink.
        {
          source: "/",
          has: [{ type: "query", key: "p", value: "(?<id>\\d+)" }],
          destination: "/shortlink/:id/",
        },
        {
          source: "/",
          has: [{ type: "query", key: "page_id", value: "(?<id>\\d+)" }],
          destination: "/shortlink/:id/",
        },
        // Leaked Elementor template URL (was in the Yoast sitemap); WordPress 301s it home.
        {
          source: "/",
          has: [{ type: "query", key: "wpr_templates" }],
          destination: "/shortlink/home/",
        },
        // CONTENT_REVIEW_REQUIRED pages pass through to WordPress untouched
        // (same HTML and metadata) until a launch decision. See config/content-review.ts.
        ...(wordpressFrontend
          ? CONTENT_REVIEW.flatMap((item) => [
              {
                source: item.path,
                destination: `${wordpressFrontend}${item.path}`,
              },
              // The page's own relative assets (e.g. /nargis/photo.png, /nargis/nargis.vcf).
              {
                source: `${item.path}:asset+`,
                destination: `${wordpressFrontend}${item.path}:asset+`,
              },
            ])
          : []),
      ],
      afterFiles: mediaOrigin
        ? [
            {
              source: "/wp-content/uploads/:path*",
              destination: `${mediaOrigin}/wp-content/uploads/:path*`,
            },
          ]
        : [],
      fallback: [],
    };
  },

  // Legacy redirects live in config/redirects.ts and are applied by proxy.ts
  // as single 301s (next.config redirects can only chain with slash handling).
};

export default nextConfig;
