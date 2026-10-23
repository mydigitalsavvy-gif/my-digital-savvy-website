import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { loadArchive, parsePager } from "@/lib/content/archives";
import { blogPath } from "@/lib/content/entries";
import { buildMetadata } from "@/lib/seo/metadata";
import { ArchiveView } from "@/components/content/views/ArchiveView";

/** /category/<slug>/ and /category/<slug>/page/<n>/, the existing WordPress archive URLs. */
type Props = PageProps<"/category/[slug]/[[...rest]]">;

/** Rendered on first request, then cached (ISR) and refreshed by cache tags. */
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

async function load(props: Props) {
  const { slug, rest } = await props.params;
  const page = parsePager(rest);
  if (page === null) return { kind: "404" as const };
  if (page === 1 && rest?.length)
    return { kind: "redirect" as const, to: `/category/${slug}/` };
  const model = await loadArchive("category", slug.toLowerCase(), page);
  if (!model) return { kind: "404" as const };
  if (slug !== slug.toLowerCase())
    return { kind: "redirect" as const, to: model.basePath };
  return { kind: "ok" as const, model, page };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const r = await load(props);
  if (r.kind !== "ok") return {};
  const path =
    r.page > 1 ? `${r.model.basePath}page/${r.page}/` : r.model.basePath;
  return buildMetadata(r.model.seo, { path, title: r.model.title });
}

export default async function Archive(props: Props) {
  const r = await load(props);
  if (r.kind === "redirect") permanentRedirect(r.to);
  if (r.kind === "404") notFound();
  return <ArchiveView model={r.model} blogPath={await blogPath()} />;
}
