import "server-only";
import type { SiteSettingsModel } from "@/types/content";
import { wpFetch } from "./client";
import { TAG, TTL } from "./cache";
import type { WPSiteSettings } from "./types";

/**
 * Global settings from the mu-plugin endpoint mds/v1/settings (backed by
 * a Secure Custom Fields options page). Returns null until that endpoint
 * exists, and callers keep their static values. Never fabricates values.
 */
export async function getSiteSettings(): Promise<SiteSettingsModel | null> {
  const s = await wpFetch<WPSiteSettings>("mds/v1/settings", {
    revalidate: TTL.settings,
    tags: [TAG.settings],
  });
  if (!s) return null;
  const str = (v?: string) => (v && v.trim() ? v.trim() : null);
  return {
    phone: str(s.phone),
    whatsappNumber: str(s.whatsapp_number)?.replace(/\D/g, "") || null,
    email: str(s.email),
    offices: (s.offices || [])
      .filter((o) => o.label && o.address)
      .map((o) => ({
        label: o.label,
        lines: o.address
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
      })),
    socialLinks: (s.social_links || []).filter(
      (l) => l.label && /^https?:\/\//.test(l.url)
    ),
    gtmId: str(s.gtm_id),
    metaPixelId: str(s.meta_pixel_id),
    googleReviewUrl:
      s.google_review_url && /^https?:\/\//.test(s.google_review_url)
        ? s.google_review_url
        : null,
  };
}
