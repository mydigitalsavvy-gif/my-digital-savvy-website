import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { entryById, isWordPressConfigured } from "@/lib/wordpress";
import { hasPreviewCredentials } from "@/lib/wordpress/client";
import { getObject } from "@/lib/wordpress/objects";
import { REST_BASE } from "@/lib/wordpress/normalize";
import { secretMatches } from "@/lib/server/secrets";

/**
 * WordPress "Preview" → Next.js Draft Mode.
 *
 *   GET /api/draft/?secret=<MDS_PREVIEW_SECRET>&type=page&id=7505
 *
 * Validates the secret, confirms the object exists using the server-side
 * preview credentials (never sent to the browser), enables Draft Mode and
 * redirects to the public URL, or to /preview/<type>/<id>/ for content
 * that isn't published yet and so has no public URL.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (!secretMatches(q.get("secret"), process.env.MDS_PREVIEW_SECRET)) {
    return NextResponse.json(
      { error: "Invalid or missing secret" },
      { status: 401 }
    );
  }
  const type = q.get("type") ?? "";
  const idRaw = q.get("id") ?? "";
  if (!REST_BASE[type] || !/^\d+$/.test(idRaw)) {
    return NextResponse.json(
      { error: "type and numeric id are required" },
      { status: 400 }
    );
  }
  if (!isWordPressConfigured() || !hasPreviewCredentials()) {
    return NextResponse.json(
      { error: "Preview is not configured on the server" },
      { status: 503 }
    );
  }

  const id = Number(idRaw);
  const obj = await getObject(type, id, { draft: true });
  if (!obj)
    return NextResponse.json({ error: "Content not found" }, { status: 404 });

  (await draftMode()).enable();
  const entry = obj.status === "publish" ? await entryById(type, id) : null;
  redirect(entry ? entry.path : `/preview/${type}/${id}/`);
}
