import "server-only";
import { cache } from "react";
import { homeContent } from "@/content/home";
import type { HomeContent, Testimonial } from "@/types/home";
import type { SiteSettingsModel, TestimonialModel } from "@/types/content";
import {
  getPathIndex,
  getSiteSettings,
  isWordPressConfigured,
  listServices,
  listTestimonials,
} from "@/lib/wordpress";

/**
 * Homepage content: WordPress where it supplies a slice, the static
 * parity baseline (content/home.ts) everywhere else.
 *
 *   WordPress unavailable / not configured → static content, unchanged
 *   WordPress provides a slice             → that slice only is replaced
 *
 * Components receive the same HomeContent shape either way and are never
 * touched by CMS changes. Each slice is applied independently, so one
 * failing source can't blank the page.
 */
export const getHomePage = cache(async (): Promise<HomeContent> => {
  if (!isWordPressConfigured()) return homeContent;
  // structuredClone keeps the imported static object pristine.
  const content: HomeContent = structuredClone(homeContent);
  await Promise.all([
    applySlice("settings", async () =>
      applySettings(content, await getSiteSettings())
    ),
    applySlice("testimonials", async () =>
      applyTestimonials(content, await listTestimonials())
    ),
    applySlice("services", async () =>
      applyServices(content, await listServices())
    ),
    applySlice("blog link", async () => {
      const index = await getPathIndex();
      if (index.blogIndexPath) content.blog.cta.href = index.blogIndexPath;
    }),
  ]);
  return content;
});

/** Kept for existing imports. */
export const getHomeContent = getHomePage;

async function applySlice(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.error(
      `[home] WordPress slice "${name}" failed, keeping static content:`,
      error
    );
  }
}

/** "918149105083" → "+91 81491 05083" (other formats are left as entered). */
function formatIndianNumber(digits: string): string {
  const m = digits.match(/^91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : `+${digits}`;
}

function applySettings(c: HomeContent, s: SiteSettingsModel | null) {
  if (!s) return;
  if (s.email) c.contact.email = s.email;
  if (s.whatsappNumber) {
    c.contact.whatsappNumber = s.whatsappNumber;
    c.contact.whatsappDisplay = formatIndianNumber(s.whatsappNumber);
    c.popup.whatsappNumber = s.whatsappNumber;
  }
  if (s.offices.length) c.contact.offices = s.offices;
  if (s.socialLinks.length)
    c.footer.social = s.socialLinks.map((l) => ({
      label: l.label,
      href: l.url,
    }));
  if (s.googleReviewUrl) c.proof.rating.href = s.googleReviewUrl;
}

function toQuote(t: TestimonialModel, quoted: boolean): Testimonial {
  return {
    quote: [quoted ? `"${t.review}"` : t.review],
    name: t.name,
    source: t.source ?? "Review",
  };
}

/** Featured + up to five supporting voices, same composition as the reference. */
function applyTestimonials(c: HomeContent, list: TestimonialModel[]) {
  if (list.length < 2) return;
  const [featured, ...rest] = list;
  c.proof.featured = toQuote(featured, false);
  c.proof.voices = rest.slice(0, 5).map((t) => toQuote(t, true));
  c.proof.marqueeNames = list
    .slice(0, 6)
    .map((t) => `${t.name}${t.rating === 5 ? " ★★★★★" : ""}`);
}

/** Service CPT copy overrides the matching catalogue panel's lede; icons/colours stay design-owned. */
function applyServices(
  c: HomeContent,
  services: Awaited<ReturnType<typeof listServices>>
) {
  for (const svc of services) {
    const slug = svc.acf?.catalogue_slug;
    const item = slug
      ? c.services.items.find((i) => i.slug === slug)
      : undefined;
    const sub = svc.acf?.short_description?.replace(/<[^>]+>/g, "").trim();
    if (item && sub) item.sub = sub;
  }
}
