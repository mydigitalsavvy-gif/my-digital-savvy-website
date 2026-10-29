import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob, listJobs } from "@/lib/careers/jobs";
import { isJobOpen } from "@/types/careers";
import { absoluteUrl } from "@/lib/site";
import { buildBreadcrumbSchema, buildJobPostingSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/content/PageParts";
import { JobPills } from "@/components/careers/JobPills";
import { ApplicationForm } from "@/components/careers/ApplicationForm";
import { CareersContact } from "@/components/careers/CareersContact";
import { formatDeadline } from "@/lib/careers/format";

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    return (await listJobs()).map((j) => ({ slug: j.slug }));
  } catch {
    return [];
  }
}

type Props = PageProps<"/careers/[slug]">;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const job = await getJob(slug);
  if (!job) return {};
  const path = `/careers/${job.slug}/`;
  return {
    title: job.title,
    description:
      job.summary ??
      `${job.title} at My Digital Savvy: ${job.experienceRequired}, ${job.vacancies} ${job.vacancies === 1 ? "opening" : "openings"}.`,
    alternates: { canonical: absoluteUrl(path) },
  };
}

export default async function JobDetailPage(props: Props) {
  const { slug } = await props.params;
  const job = await getJob(slug);
  if (!job || job.status === "draft" || job.status === "archived") notFound();

  const open = isJobOpen(job);
  const path = `/careers/${job.slug}/`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Careers", path: "/careers/" },
    { name: job.title, path },
  ];
  const jobPosting = buildJobPostingSchema({
    title: job.title,
    description: job.summary,
    datePosted: job.modified,
    validThrough: job.applicationDeadline,
    employmentType: job.employmentType,
    location: job.location,
    url: absoluteUrl(path),
  });
  const deadline = formatDeadline(job.applicationDeadline);

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(crumbs.map((c) => ({ name: c.name, url: absoluteUrl(c.path) })))} />
      {jobPosting ? <JsonLd data={jobPosting} /> : null}
      <main>
        <section className="cx-hero wrap cy-job-hero">
          <Breadcrumbs items={crumbs} />
          {job.category ? (
            <div className="eyebrow">
              <span className="pip" aria-hidden="true"></span>
              <span className="label">{job.category}</span>
            </div>
          ) : null}
          <h1 className="display">{job.title}</h1>
          <JobPills job={job} />
          {!open ? (
            <p className="cy-closed-banner" role="status">
              {job.status === "closed"
                ? `This position is closed${deadline ? ` as of ${deadline}` : ""} and is no longer accepting applications.`
                : "This position isn't currently accepting applications."}
            </p>
          ) : null}
        </section>

        <section className="wrap cx-section cy-apply-section" aria-labelledby="apply-heading">
          <div className="cy-apply-panel" id="apply">
            {open ? (
              <>
                <span className="label" id="apply-heading">Apply now</span>
                <ApplicationForm job={job} />
              </>
            ) : (
              <>
                <span className="label" id="apply-heading">Applications closed</span>
                <p>
                  This position isn&apos;t accepting applications right now. You can still{" "}
                  <Link href="/careers/">browse other open roles</Link>, or reach HR directly:
                </p>
                <CareersContact whatsappMessage={`Hi, I'd like to ask about the ${job.title} role at My Digital Savvy.`} />
              </>
            )}
          </div>
        </section>

        <section className="wrap cx-section cy-job-details" aria-labelledby="details-heading">
          <h2 className="sr-only" id="details-heading">Role details</h2>
          <div className="cx-body cy-job-details-body">
            {job.summary ? <p>{job.summary}</p> : null}
            {job.responsibilities.length ? (
              <>
                <h3>Responsibilities</h3>
                <ul>
                  {job.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {job.requiredSkills.length ? (
              <>
                <h3>Required skills</h3>
                <ul>
                  {job.requiredSkills.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {job.qualifications ? (
              <>
                <h3>Qualifications</h3>
                <p>{job.qualifications}</p>
              </>
            ) : null}
            {job.compensation ? (
              <>
                <h3>Compensation</h3>
                <p>{job.compensation}</p>
              </>
            ) : null}
            {!job.summary &&
            !job.responsibilities.length &&
            !job.requiredSkills.length &&
            !job.qualifications ? (
              <p className="cy-job-pending">
                Full role details for this position haven&apos;t been published yet. Reach out via
                the <Link href="/#contact">Contact page</Link> if you have questions before
                applying.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
