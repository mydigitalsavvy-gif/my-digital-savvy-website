import { getPathIndex } from "@/lib/wordpress";

/**
 * Target of the "/?p=123" and "/?page_id=123" rewrites in next.config.ts.
 * WordPress answered those shortlinks with a 301 to the permalink; so does
 * this. Unknown IDs 404 rather than guessing.
 */
export async function GET(req: Request, ctx: RouteContext<"/shortlink/[id]">) {
  const { id } = await ctx.params;
  if (id === "home") return Response.redirect(new URL("/", req.url), 301);
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });
  const index = await getPathIndex();
  const entry = index.entries.find(
    (e) => e.id === Number(id) && (e.wpType === "post" || e.wpType === "page")
  );
  if (!entry) return new Response("Not found", { status: 404 });
  return Response.redirect(
    new URL(entry.kind === "front-page" ? "/" : entry.path, req.url),
    301
  );
}
