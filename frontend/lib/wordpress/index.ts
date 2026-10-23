/**
 * WordPress data layer. Everything here is server-only and returns the
 * normalized models from types/content.ts, never raw REST shapes.
 */
export {
  isWordPressConfigured,
  WordPressAPIError,
  WordPressUnavailableError,
} from "./client";
export { TAG, TTL, tagFor, tagsForWordPressChange } from "./cache";
export {
  getPathIndex,
  resolvePath,
  entriesOfKind,
  entryById,
} from "./path-index";
export { getServicePage, listServices } from "./services";
export { getLocationPage } from "./location-pages";
export { getGenericPage, getPageSeo } from "./pages";
export { getPost, listPosts, allPosts } from "./posts";
export { getTerm, listTerms, getAuthorArchive } from "./taxonomies";
export { getCaseStudy, listCaseStudies } from "./case-studies";
export { listTestimonials } from "./testimonials";
export { getIndustry } from "./industries";
export { listPortfolio } from "./portfolio";
export { getSiteSettings } from "./site-settings";
export { getYoastHead, pagedSeo } from "./seo";
