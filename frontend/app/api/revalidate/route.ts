import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TAG, tagFor, tagsForWordPressChange } from "@/lib/wordpress/cache";
import { normalizePath } from "@/lib/site";
import { secretMatches } from "@/lib/server/secrets";

/**
 * On-demand revalidation, called by the WordPress mu-plugin on save.
 *
 *   POST /api/revalidate/
 *   x-mds-secret: <MDS_REVALIDATE_SECRET>
 *   { "type": "page", "id": 7505, "slug": "seo-agency-in-nagpur",
 *     "path": "/seo-agency-in-nagpur/", "previous_paths": ["/old/"] }
 *
 * `type` is the WordPress object type (page, post, service, location_page,
 * case_study, testimonial, portfolio_project, industry, category,
 * post_tag) or "settings" / "all". Tags expire immediately so the next
 * request renders fresh content.
 */
export const dynamic = "force-dynamic";

const ALL_TAGS = Object.values(TAG);

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-mds-secret");
  if (!secretMatches(secret, process.env.MDS_REVALIDATE_SECRET)) {
    return NextResponse.json(
      { revalidated: false, error: "Invalid or missing secret" },
      { status: 401 }
    );
  }

  let body: {
    type?: unknown;
    id?: unknown;
    slug?: unknown;
    path?: unknown;
    previous_paths?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { revalidated: false, error: "Body must be JSON" },
      { status: 400 }
    );
  }

  const type = typeof body.type === "string" ? body.type : "";
  const id =
    typeof body.id === "number"
      ? body.id
      : typeof body.id === "string" && /^\d+$/.test(body.id)
        ? Number(body.id)
        : null;
  const slug = typeof body.slug === "string" ? body.slug : null;
  const path =
    typeof body.path === "string" && body.path.startsWith("/")
      ? normalizePath(body.path)
      : null;
  const previous = Array.isArray(body.previous_paths)
    ? body.previous_paths
        .filter((p): p is string => typeof p === "string" && p.startsWith("/"))
        .map(normalizePath)
    : [];

  const tags =
    type === "all"
      ? ALL_TAGS
      : [
          ...tagsForWordPressChange({ type, id, slug, path }),
          ...previous.map((p) => tagFor(TAG.seo, p)),
        ];
  if (!tags.length) {
    return NextResponse.json(
      { revalidated: false, error: `Unknown content type "${type}"` },
      { status: 400 }
    );
  }

  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({
    revalidated: true,
    type,
    tags: [...new Set(tags)],
    now: Date.now(),
  });
}

export function GET() {
  return NextResponse.json(
    { error: "Use POST" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
