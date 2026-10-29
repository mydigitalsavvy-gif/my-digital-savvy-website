import "server-only";
import { cache } from "react";
import { isJobOpen, type JobModel, type OpportunityCategory } from "@/types/careers";
import { normalizeEmDash } from "@/lib/wordpress/html-blocks";
import { STATIC_JOBS, STATIC_OPPORTUNITY_CATEGORIES } from "./static-jobs";
import { careersFetch, isCareersWordPressConfigured } from "./wp-client";

/**
 * Jobs are a replace, not a merge: once the WordPress plugin is installed
 * and returns a successful (even empty) response, that list is the whole
 * truth — mixing in the static seed alongside real CMS jobs would show
 * duplicates. The static seed is used only when WordPress isn't configured
 * at all, or the request itself fails (outage/misconfiguration), never
 * when WordPress legitimately reports zero published jobs.
 */

interface RawJob {
  id: string | number;
  slug: string;
  title: string;
  vacancies: number;
  experienceRequired: string;
  employmentType: string | null;
  status: string;
  category: string | null;
  location: string | null;
  workArrangement: string | null;
  summary: string | null;
  responsibilities: string[] | null;
  requiredSkills: string[] | null;
  qualifications: string | null;
  compensation: string | null;
  applicationDeadline: string | null;
  modified: string | null;
}

const EMPLOYMENT_TYPES = new Set(["full-time", "freelance", "white-label"]);
const STATUSES = new Set(["draft", "published", "closed", "archived"]);

/** Free-text WordPress fields pass through the sitewide em-dash normalizer too (see html-blocks.ts). */
function cleanText(value: string | null | undefined): string {
  return value ? normalizeEmDash(value) : "";
}

function normalizeJob(raw: RawJob): JobModel {
  return {
    id: String(raw.id),
    slug: raw.slug,
    title: cleanText(raw.title),
    vacancies: Number.isFinite(raw.vacancies) ? Math.max(0, raw.vacancies) : 0,
    experienceRequired: cleanText(raw.experienceRequired),
    employmentType: EMPLOYMENT_TYPES.has(raw.employmentType ?? "")
      ? (raw.employmentType as JobModel["employmentType"])
      : null,
    status: STATUSES.has(raw.status)
      ? (raw.status as JobModel["status"])
      : "draft",
    category: raw.category ? cleanText(raw.category) : null,
    location: raw.location ? cleanText(raw.location) : null,
    workArrangement: raw.workArrangement ? cleanText(raw.workArrangement) : null,
    summary: raw.summary ? cleanText(raw.summary) : null,
    responsibilities: Array.isArray(raw.responsibilities)
      ? raw.responsibilities.filter(Boolean).map(cleanText)
      : [],
    requiredSkills: Array.isArray(raw.requiredSkills)
      ? raw.requiredSkills.filter(Boolean).map(cleanText)
      : [],
    qualifications: raw.qualifications ? cleanText(raw.qualifications) : null,
    compensation: raw.compensation ? cleanText(raw.compensation) : null,
    applicationDeadline: raw.applicationDeadline || null,
    modified: raw.modified || null,
    source: "wordpress",
  };
}

export interface JobsFeed {
  jobs: JobModel[];
  source: "wordpress" | "static";
  /**
   * True when WordPress IS configured but the live fetch failed (outage,
   * misconfiguration) — static jobs are shown as a safety net, not because
   * nothing is configured. Pages can use this to show an honest "showing
   * recent listings" notice instead of silently pretending the live feed
   * succeeded.
   */
  degraded: boolean;
}

export const getJobsFeed = cache(async (): Promise<JobsFeed> => {
  if (isCareersWordPressConfigured()) {
    const raw = await careersFetch<RawJob[]>("mds-careers/v1/jobs", {
      revalidate: 300,
      tags: ["careers-jobs"],
    });
    if (raw !== null) {
      return { jobs: raw.map(normalizeJob), source: "wordpress", degraded: false };
    }
    return { jobs: STATIC_JOBS, source: "static", degraded: true };
  }
  return { jobs: STATIC_JOBS, source: "static", degraded: false };
});

export async function listJobs(): Promise<JobModel[]> {
  return (await getJobsFeed()).jobs;
}

export async function getJob(slug: string): Promise<JobModel | null> {
  const jobs = await listJobs();
  return jobs.find((j) => j.slug === slug) ?? null;
}

export const listOpportunityCategories = cache(
  async (): Promise<OpportunityCategory[]> => {
    if (isCareersWordPressConfigured()) {
      const raw = await careersFetch<{ categories: OpportunityCategory[] }>(
        "mds-careers/v1/settings",
        { revalidate: 3600, tags: ["careers-settings"] }
      );
      if (raw?.categories?.length) {
        return raw.categories.map((c) => ({
          ...c,
          label: cleanText(c.label),
          description: cleanText(c.description),
        }));
      }
    }
    return STATIC_OPPORTUNITY_CATEGORIES;
  }
);

/** Total open vacancies across every published, non-expired job — for the hero stat. */
export async function totalOpenVacancies(): Promise<number> {
  const jobs = await listJobs();
  return jobs.filter(isJobOpen).reduce((sum, j) => sum + j.vacancies, 0);
}
