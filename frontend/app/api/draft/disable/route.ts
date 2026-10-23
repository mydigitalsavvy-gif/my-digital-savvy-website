import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/** Leave Draft Mode and return to the page (same-site paths only). */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  (await draftMode()).disable();
  const target = request.nextUrl.searchParams.get("redirect") ?? "/";
  redirect(target.startsWith("/") && !target.startsWith("//") ? target : "/");
}
