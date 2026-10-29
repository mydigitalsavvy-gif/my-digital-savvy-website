/**
 * Careers domain types. Deliberately separate from types/content.ts: jobs
 * are not part of the WordPress path-index / structured-entry system that
 * powers services/case-studies/etc. (see lib/careers/jobs.ts for why) — a
 * distinct, self-contained model keeps that decoupling obvious.
 */

export type EmploymentType = "full-time" | "freelance" | "white-label";

export type JobStatus = "draft" | "published" | "closed" | "archived";

export interface JobModel {
  /** WordPress post ID as a string once CMS-backed; the static slug otherwise. */
  id: string;
  slug: string;
  title: string;
  vacancies: number;
  /** Free-form so values like "1+ year*" and "Fresher – 1 year" round-trip exactly. */
  experienceRequired: string;
  /** Required before a job can be published; null only for not-yet-complete drafts. */
  employmentType: EmploymentType | null;
  status: JobStatus;
  category: string | null;
  location: string | null;
  workArrangement: string | null;
  summary: string | null;
  responsibilities: string[];
  requiredSkills: string[];
  qualifications: string | null;
  compensation: string | null;
  /** ISO date (yyyy-mm-dd), or null when not set. */
  applicationDeadline: string | null;
  modified: string | null;
  source: "wordpress" | "static";
}

export function isJobOpen(job: JobModel): boolean {
  if (job.status !== "published") return false;
  if (job.applicationDeadline) {
    const deadline = new Date(`${job.applicationDeadline}T23:59:59`);
    if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now())
      return false;
  }
  return true;
}

export interface OpportunityCategory {
  type: EmploymentType;
  label: string;
  description: string;
}

/* ── form payloads (shared between the client components and API routes) ── */

export interface ApplicationFormValues {
  jobId: string;
  jobSlug: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  experience: string;
  skills: string;
  portfolioUrl: string;
  coverLetter: string;
  consent: boolean;
  /** Honeypot — real users never fill this in. */
  company: string;
  /** Timestamp (ms) the form was rendered, for a minimum-time-to-submit check. */
  renderedAt: number;
}

export interface PartnershipFormValues {
  agencyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  servicesRequired: string;
  estimatedVolume: string;
  message: string;
  consent: boolean;
  company: string;
  renderedAt: number;
}

export interface ApplicationSuccess {
  applicationId: string;
  jobTitle: string;
}
