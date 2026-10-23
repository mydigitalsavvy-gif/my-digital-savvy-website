import "server-only";
import type { TestimonialModel } from "@/types/content";
import { htmlToText } from "./html-blocks";
import { listObjects } from "./objects";
import { imageField, title } from "./normalize";
import type { WPTestimonial } from "./types";

export async function normalizeTestimonial(
  t: WPTestimonial
): Promise<TestimonialModel> {
  const f = t.acf ?? {};
  const rating =
    f.rating === undefined || f.rating === "" ? null : Number(f.rating);
  return {
    id: t.id,
    name: f.name ? htmlToText(f.name) : title(t),
    company: f.company ? htmlToText(f.company) : null,
    designation: f.designation ? htmlToText(f.designation) : null,
    photo: await imageField(f.photo),
    review: htmlToText(f.review ?? t.content?.rendered),
    rating:
      rating !== null && Number.isFinite(rating)
        ? Math.max(0, Math.min(5, rating))
        : null,
    source: f.source ? htmlToText(f.source) : null,
    sourceUrl: f.source_url || null,
  };
}

/** Real reviews only; never padded. [] until the testimonial type exists. */
export async function listTestimonials(): Promise<TestimonialModel[]> {
  const items = await listObjects<WPTestimonial>("testimonial");
  const all = await Promise.all(items.map(normalizeTestimonial));
  return all.filter((t) => t.name && t.review);
}
