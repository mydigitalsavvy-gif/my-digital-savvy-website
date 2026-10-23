import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { entriesOfKind } from "@/lib/wordpress";
import { entryMetadata, renderEntry } from "@/lib/content/entries";
import { resolveStructured } from "@/lib/content/structured-route";
import { PreviewBar } from "@/components/content/PreviewBar";

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    return (await entriesOfKind("service"))
      .filter((e) => e.path.startsWith("/services/"))
      .map((e) => ({ slug: e.path.split("/")[2] }));
  } catch {
    return [];
  }
}

type Props = PageProps<"/services/[slug]">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await resolveStructured("services", "service", slug);
  if (res.type !== "entry") return {};
  const { isEnabled } = await draftMode();
  return entryMetadata(res.entry, { draft: isEnabled, noindex: isEnabled });
}

export default async function Page(props: Props) {
  const { slug } = await props.params;
  const res = await resolveStructured("services", "service", slug);
  if (res.type === "redirect") permanentRedirect(res.to);
  if (res.type === "not-found") notFound();
  const { isEnabled: draft } = await draftMode();
  const view = await renderEntry(res.entry, { draft });
  if (!view) notFound();
  return (
    <>
      {view}
      {draft ? <PreviewBar path={res.entry.path} /> : null}
    </>
  );
}
