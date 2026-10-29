import { z } from "zod";

/**
 * Shared validation for the candidate application and partnership enquiry
 * forms — one source of truth used by both the client components (inline
 * errors) and the API routes (the only validation that's actually trusted;
 * see app/api/careers/*). This is the one new dependency this feature adds:
 * the existing ConsultPopup's plain manual-state validation doesn't scale
 * to a 10+ field, conditionally-rendered, file-upload form.
 */

export const EMPLOYMENT_TYPES = ["full-time", "freelance", "white-label"] as const;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

const optionalText = (max: number) =>
  z.string().trim().max(max, "That's too long").optional().default("");

const name = requiredText("Full name", 120).min(2, "Enter your full name");

const phone = requiredText("Phone or WhatsApp number", 20).regex(
  /^[+\d][\d\s-]{6,}$/,
  "Use digits only, with an optional + country code"
);

const email = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .max(200)
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Enter a valid email address",
  });

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .default("")
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
    message: "Enter a valid URL starting with http:// or https://",
  });

const consent = z
  .boolean()
  .refine((v) => v === true, { message: "Please accept the privacy notice to continue" });

/** Honeypot + minimum-time-to-submit, checked outside zod (not a field error). */
export function looksLikeSpam(input: { company: string; renderedAt: number }): boolean {
  if (input.company.trim() !== "") return true;
  const elapsedMs = Date.now() - input.renderedAt;
  return elapsedMs < 1500;
}

export const applicationSchema = z.object({
  jobId: requiredText("Job", 100),
  jobSlug: requiredText("Job", 200),
  jobTitle: requiredText("Job title", 200),
  fullName: name,
  email,
  phone,
  employmentType: z.enum(EMPLOYMENT_TYPES, {
    error: "Select the employment type you're applying for",
  }),
  experience: optionalText(200),
  skills: optionalText(1000),
  portfolioUrl: optionalUrl,
  coverLetter: optionalText(4000),
  consent,
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export const partnershipSchema = z.object({
  agencyName: requiredText("Agency or business name", 160).min(2, "Enter your agency name"),
  contactName: name,
  workEmail: email,
  phone,
  servicesRequired: requiredText("Services required", 1000).min(
    2,
    "Tell us what services you're interested in"
  ),
  estimatedVolume: optionalText(200),
  message: optionalText(4000),
  consent,
});

export type PartnershipInput = z.infer<typeof partnershipSchema>;

/** Flattens a zod error into { field: message } for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ── résumé constraints (used by both the file input and the API route) ── */

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_ACCEPT = ".pdf,.doc,.docx";
export const RESUME_ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
