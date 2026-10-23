/**
 * Pages whose final purpose is undecided. They keep working EXACTLY as
 * WordPress serves them today until a launch decision is made: the
 * request is passed through to the WordPress frontend (same HTML, same
 * metadata, same assets). Nothing is redesigned, invented, redirected or
 * deleted.
 *
 * Cutover note: if the WordPress host later redirects its own frontend to
 * the main domain, these paths must be excluded from that redirect.
 */
export interface ContentReviewItem {
  path: string;
  status: "CONTENT_REVIEW_REQUIRED";
  handling: "wordpress-passthrough";
  reason: string;
}

export const CONTENT_REVIEW: ContentReviewItem[] = [
  {
    path: "/nargis/",
    status: "CONTENT_REVIEW_REQUIRED",
    handling: "wordpress-passthrough",
    reason:
      "Personal digital business card (Nargis Sheikh) rendered by a custom template outside Elementor and Yoast; the WordPress content field is empty, so it cannot be rebuilt from CMS data. Owner to decide whether it belongs on the agency site.",
  },
];

export const CONTENT_REVIEW_PATHS = new Set(CONTENT_REVIEW.map((i) => i.path));
