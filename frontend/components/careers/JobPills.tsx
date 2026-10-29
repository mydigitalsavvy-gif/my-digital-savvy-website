import type { JobModel } from "@/types/careers";
import { employmentTypeLabel, formatDeadline } from "@/lib/careers/format";

/** The pill-badge metadata row shown on both the job card and the job detail page. */
export function JobPills({ job }: { job: JobModel }) {
  const deadline = formatDeadline(job.applicationDeadline);
  return (
    <ul className="cy-pills">
      {job.location ? <li className="cy-pill">{job.location}</li> : null}
      <li className="cy-pill">{employmentTypeLabel(job.employmentType)}</li>
      <li className="cy-pill">{job.experienceRequired}</li>
      {job.workArrangement ? (
        <li className="cy-pill">{job.workArrangement}</li>
      ) : null}
      <li className="cy-pill">
        {job.vacancies} {job.vacancies === 1 ? "opening" : "openings"}
      </li>
      {deadline ? (
        <li className="cy-pill cy-pill-deadline">Apply by {deadline}</li>
      ) : null}
    </ul>
  );
}
