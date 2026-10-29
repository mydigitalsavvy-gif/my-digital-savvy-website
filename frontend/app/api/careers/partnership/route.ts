import { NextResponse, type NextRequest } from "next/server";
import {
  fieldErrors,
  looksLikeSpam,
  partnershipSchema,
} from "@/lib/careers/validation";
import { clientIp, isRateLimited } from "@/lib/careers/rate-limit";
import { careersWrite } from "@/lib/careers/wp-client";

/**
 * White-label agency partnership enquiry. Deliberately a separate route,
 * separate schema and separate WordPress table from job applications —
 * see components/careers/PartnershipForm.tsx and the spec's "do not mix
 * white-label leads with employment applications."
 *
 *   POST /api/careers/partnership
 *   multipart/form-data (no file upload for this form)
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  if (isRateLimited(`partnership:${ip}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Could not read the submitted form." },
      { status: 400 }
    );
  }

  const get = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : "";
  };

  const spamCheck = {
    company: get("company"),
    renderedAt: Number(get("renderedAt")) || 0,
  };
  if (looksLikeSpam(spamCheck)) {
    console.warn(`[careers] partnership submission dropped as spam (ip=${ip})`);
    return NextResponse.json(
      { ok: false, message: "We couldn't process that submission." },
      { status: 400 }
    );
  }

  const parsed = partnershipSchema.safeParse({
    agencyName: get("agencyName"),
    contactName: get("contactName"),
    workEmail: get("workEmail"),
    phone: get("phone"),
    servicesRequired: get("servicesRequired"),
    estimatedVolume: get("estimatedVolume"),
    message: get("message"),
    consent: get("consent") === "true",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const forward = new FormData();
  for (const [key, value] of Object.entries(parsed.data)) {
    forward.set(key, String(value));
  }
  forward.set("source", "website");

  const result = await careersWrite<{ enquiryId: string }>(
    "mds-careers/v1/partnership",
    forward
  );

  if (result.ok) {
    return NextResponse.json({ ok: true, ...result.data });
  }
  if (result.reason === "not-configured") {
    return NextResponse.json(
      {
        ok: false,
        message:
          "We're not able to accept partnership enquiries online just yet. Please email hr@mydigitalsavvy.com instead.",
        contactEmail: "hr@mydigitalsavvy.com",
      },
      { status: 503 }
    );
  }
  if (result.reason === "unreachable") {
    return NextResponse.json(
      {
        ok: false,
        message: "We couldn't reach our systems. Please try again in a moment.",
      },
      { status: 502 }
    );
  }
  return NextResponse.json(
    {
      ok: false,
      message: result.message || "That enquiry couldn't be submitted. Please try again.",
    },
    { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
  );
}

export function GET() {
  return NextResponse.json(
    { error: "Use POST" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
