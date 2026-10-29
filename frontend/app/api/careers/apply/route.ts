import { NextResponse, type NextRequest } from "next/server";
import {
  applicationSchema,
  fieldErrors,
  looksLikeSpam,
} from "@/lib/careers/validation";
import { checkResumeFile } from "@/lib/careers/file-validation";
import { clientIp, isRateLimited } from "@/lib/careers/rate-limit";
import { careersWrite } from "@/lib/careers/wp-client";
import type { ApplicationSuccess } from "@/types/careers";

/**
 * Candidate application submission. Entirely separate from the "Book a
 * Free Audit" popup and any business-enquiry path — see
 * components/careers/ApplicationForm.tsx.
 *
 *   POST /api/careers/apply
 *   multipart/form-data: application fields + an optional "resume" file
 *
 * Trust boundary: nothing here is trusted just because the browser sent
 * it. Every field is re-validated server-side with the same zod schema
 * the form uses for inline errors, the résumé is signature-checked (not
 * trusted by filename/MIME), and the WordPress plugin re-validates all of
 * it again on its end before writing anything to the database.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  if (isRateLimited(`apply:${ip}`)) {
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
    console.warn(`[careers] apply submission dropped as spam (ip=${ip})`);
    return NextResponse.json(
      { ok: false, message: "We couldn't process that submission." },
      { status: 400 }
    );
  }

  const parsed = applicationSchema.safeParse({
    jobId: get("jobId"),
    jobSlug: get("jobSlug"),
    jobTitle: get("jobTitle"),
    fullName: get("fullName"),
    email: get("email"),
    phone: get("phone"),
    employmentType: get("employmentType"),
    experience: get("experience"),
    skills: get("skills"),
    portfolioUrl: get("portfolioUrl"),
    coverLetter: get("coverLetter"),
    consent: get("consent") === "true",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: fieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  const resume = form.get("resume");
  if (!(resume instanceof File) || resume.size === 0) {
    return NextResponse.json(
      { ok: false, errors: { resume: "Attach your résumé/CV to continue" } },
      { status: 400 }
    );
  }
  const fileCheck = await checkResumeFile(resume);
  if (!fileCheck.ok) {
    return NextResponse.json(
      { ok: false, errors: { resume: fileCheck.error } },
      { status: 400 }
    );
  }

  const forward = new FormData();
  for (const [key, value] of Object.entries(parsed.data)) {
    forward.set(key, String(value));
  }
  forward.set("source", "website");
  forward.set("resume", resume, resume.name);

  const result = await careersWrite<ApplicationSuccess>(
    "mds-careers/v1/applications",
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
          "We're not accepting applications online just yet. Please email your application to hr@mydigitalsavvy.com instead.",
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
      message: result.message || "That application couldn't be submitted. Please try again.",
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
