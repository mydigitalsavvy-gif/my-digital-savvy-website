import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import type { PathEntry, PathKind } from "@/types/content";
import { getObject } from "@/lib/wordpress/objects";
import { REST_BASE, title } from "@/lib/wordpress/normalize";
import { LEGACY_PAGE_KINDS } from "@/config/legacy-pages";
import { renderEntry } from "@/lib/content/entries";
import { PreviewBar } from "@/components/content/PreviewBar";

/** Unpublished content preview. Only reachable in Draft Mode; never indexed. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

const KIND: Record<string, PathKind> = {
  post: "post",
  service: "service",
  location_page: "location",
  case_study: "case-study",
  industry: "industry",
};

export default async function Preview(
  props: PageProps<"/preview/[type]/[id]">
) {
  const { isEnabled } = await draftMode();
  if (!isEnabled) notFound();
  const { type, id } = await props.params;
  if (!REST_BASE[type] || !/^\d+$/.test(id)) notFound();

  const obj = await getObject(type, Number(id), { draft: true });
  if (!obj) notFound();
  const path = `/preview/${type}/${id}/`;
  const kind: PathKind =
    type === "page"
      ? (LEGACY_PAGE_KINDS[obj.slug]?.kind ?? "page")
      : (KIND[type] ?? "page");
  const entry: PathEntry = {
    path,
    kind,
    wpType: type,
    id: obj.id,
    slug: obj.slug,
    title: title(obj),
    modified: obj.modified ?? null,
    previousPaths: [],
    catalogueSlug:
      type === "page"
        ? (LEGACY_PAGE_KINDS[obj.slug]?.catalogueSlug ?? null)
        : null,
  };
  const view = await renderEntry(entry, { draft: true });
  if (!view) notFound();
  return (
    <>
      {view}
      <PreviewBar path="/" />
    </>
  );
}
