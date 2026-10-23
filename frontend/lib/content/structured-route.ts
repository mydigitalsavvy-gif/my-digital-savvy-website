import "server-only";
import type { PathEntry, PathKind } from "@/types/content";
import { entriesOfKind, resolvePath } from "@/lib/wordpress";

/**
 * /services/<slug>/, /case-studies/<slug>/, /industries/<slug>/.
 *
 * - The item's public path IS this URL      → render it here.
 * - The item lives at a legacy root URL      → 301 there (one canonical URL).
 * - This URL is a previous path of something → 301 to its current path.
 * - Anything else                            → 404.
 */
export async function resolveStructured(
  prefix: "services" | "case-studies" | "industries",
  kind: PathKind,
  slug: string
): Promise<
  | { type: "entry"; entry: PathEntry }
  | { type: "redirect"; to: string }
  | { type: "not-found" }
> {
  const path = `/${prefix}/${slug}/`;
  const res = await resolvePath(path);
  if (res.type !== "not-found") {
    if (res.type === "entry" && res.entry.kind !== kind)
      return { type: "not-found" };
    return res;
  }
  const elsewhere = (await entriesOfKind(kind)).find(
    (e) => e.slug === slug.toLowerCase()
  );
  return elsewhere
    ? { type: "redirect", to: elsewhere.path }
    : { type: "not-found" };
}
