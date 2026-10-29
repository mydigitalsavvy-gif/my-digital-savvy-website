import type { EmploymentType } from "@/types/careers";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  freelance: "Freelance",
  "white-label": "White-label",
};

export function employmentTypeLabel(type: EmploymentType | null): string {
  return type ? EMPLOYMENT_TYPE_LABELS[type] : "Employment type to be confirmed";
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : dateFmt.format(d);
}

/** Heuristic only (no CMS field for this yet): simpler application UX for entry-level/intern roles. */
export function isEntryLevel(experienceRequired: string): boolean {
  return /fresher|intern/i.test(experienceRequired);
}

/** Heuristic only: surface the portfolio field prominently for creative/teaching roles. */
export function benefitsFromPortfolio(job: {
  title: string;
  category: string | null;
}): boolean {
  return /design|video|creative|teacher|editor|content/i.test(
    `${job.title} ${job.category ?? ""}`
  );
}
