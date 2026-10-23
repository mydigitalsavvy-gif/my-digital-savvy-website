/**
 * Cache policy: one place for revalidation windows and tag names, shared
 * by the fetchers (assign tags) and /api/revalidate (invalidate tags).
 */

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export const TTL = {
  service: DAY,
  location: DAY,
  industry: DAY,
  caseStudy: DAY,
  testimonial: DAY,
  portfolio: DAY,
  page: DAY,
  post: HOUR,
  taxonomy: HOUR,
  paths: DAY,
  settings: DAY,
  seo: DAY,
} as const;

export const TAG = {
  paths: "paths",
  settings: "settings",
  home: "home",
  service: "service",
  location: "location",
  industry: "industry",
  caseStudy: "case-study",
  testimonial: "testimonial",
  portfolio: "portfolio",
  page: "page",
  post: "post",
  category: "category",
  tag: "tag",
  seo: "seo",
} as const;

export type TagName = (typeof TAG)[keyof typeof TAG];

/** "service:seo-agency-in-nagpur" */
export function tagFor(type: TagName, key: string | number): string {
  return `${type}:${String(key).toLowerCase()}`.slice(0, 256);
}

/**
 * WordPress object type (as sent by the save webhook) → tags to invalidate.
 * Every content change also invalidates `paths` (slugs, status and
 * previous paths can change on any save) and the homepage when the type
 * feeds a homepage section.
 */
export function tagsForWordPressChange(input: {
  type: string;
  slug?: string | null;
  id?: number | null;
  path?: string | null;
}): string[] {
  const map: Record<string, TagName> = {
    service: TAG.service,
    location_page: TAG.location,
    industry: TAG.industry,
    case_study: TAG.caseStudy,
    testimonial: TAG.testimonial,
    portfolio_project: TAG.portfolio,
    page: TAG.page,
    post: TAG.post,
    category: TAG.category,
    post_tag: TAG.tag,
    settings: TAG.settings,
  };
  const base = map[input.type];
  if (!base) return [];
  const tags = new Set<string>([base]);
  if (input.slug) tags.add(tagFor(base, input.slug));
  if (input.id) tags.add(tagFor(base, input.id));
  if (input.path) tags.add(tagFor(TAG.seo, input.path));
  if (base !== TAG.settings) tags.add(TAG.paths);
  if (base === TAG.post || base === TAG.category || base === TAG.tag)
    tags.add(TAG.post);
  const feedsHome: TagName[] = [
    TAG.settings,
    TAG.service,
    TAG.testimonial,
    TAG.post,
  ];
  if (feedsHome.includes(base)) tags.add(TAG.home);
  return [...tags];
}
