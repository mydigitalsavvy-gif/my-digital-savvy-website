import Link from "next/link";
import { isJobOpen, type JobModel } from "@/types/careers";
import { employmentTypeLabel, formatDeadline } from "@/lib/careers/format";

export function JobCard({ job }: { job: JobModel }) {
  const open = isJobOpen(job);
  const deadline = formatDeadline(job.applicationDeadline);
  return (
    <li className={open ? "cy-job-card" : "cy-job-card is-closed"}>
      <Link href={`/careers/${job.slug}/`} className="cy-job-card-link">
        <div className="cy-job-card-top">
          <span className="cy-job-status" data-status={job.status}>
            {open ? "Open" : job.status === "closed" ? "Closed" : "Unavailable"}
          </span>
          {job.category ? <span className="label">{job.category}</span> : null}
        </div>
        <h3 className="cy-job-title">{job.title}</h3>
        <ul className="cy-pills cy-pills-compact">
          <li className="cy-pill">{employmentTypeLabel(job.employmentType)}</li>
          <li className="cy-pill">{job.experienceRequired}</li>
          <li className="cy-pill">
            {job.vacancies} {job.vacancies === 1 ? "opening" : "openings"}
          </li>
        </ul>
        {job.summary ? <p className="cy-job-summary">{job.summary}</p> : null}
        <span className="cy-job-cta">
          {open ? "View & apply" : "View details"} →
        </span>
        {!open && deadline ? (
          <span className="cy-job-closed-note">Applications closed {deadline}</span>
        ) : null}
      </Link>
    </li>
  );
}
