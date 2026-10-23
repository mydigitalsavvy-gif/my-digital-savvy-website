import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolvePath } from "@/lib/wordpress";
import { blogArchive } from "@/lib/content/entries";
import { buildMetadata } from "@/lib/seo/metadata";
import { ArchiveView } from "@/components/content/views/ArchiveView";

/** Blog index pagination, exactly as WordPress serves it: /my-digital-savvy-blog/page/2/ */

/** Rendered on first request, then cached (ISR) and refreshed by cache tags. */
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

async function load(slug: string, pageParam: string) {
  if (!/^\d+$/.test(pageParam)) return { kind: "404" as const };
  const page = Number(pageParam);
  const res = await resolvePath(`/${slug}/`);
  if (res.type !== "entry" || res.entry.kind !== "blog-index")
    return { kind: "404" as const };
  if (page <= 1) return { kind: "redirect" as const, to: res.entry.path };
  const model = await blogArchive(res.entry, page);
  return model
    ? { kind: "ok" as const, model, entry: res.entry }
    : { kind: "404" as const };
}

export async function generateMetadata(
  props: PageProps<"/[slug]/page/[page]">
): Promise<Metadata> {
  const { slug, page } = await props.params;
  const r = await load(slug, page);
  if (r.kind !== "ok") return {};
  return buildMetadata(r.model.seo, {
    path: `${r.entry.path}page/${page}/`,
    title: `${r.model.title} — Page ${page}`,
  });
}

export default async function BlogPaged(
  props: PageProps<"/[slug]/page/[page]">
) {
  const { slug, page } = await props.params;
  const r = await load(slug, page);
  if (r.kind === "redirect") permanentRedirect(r.to);
  if (r.kind === "404") notFound();
  return <ArchiveView model={r.model} blogPath={r.entry.path} />;
}
