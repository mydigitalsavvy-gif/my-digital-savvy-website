"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { EmploymentType, JobModel } from "@/types/careers";
import { employmentTypeLabel } from "@/lib/careers/format";
import { JobCard } from "./JobCard";

const EMPLOYMENT_FILTERS: EmploymentType[] = ["full-time", "freelance", "white-label"];

/** Filterable job grid. Client component: filter state only, data comes from the server. */
export function JobBoard({ jobs }: { jobs: JobModel[] }) {
  const visible = useMemo(
    () => jobs.filter((j) => j.status === "published" || j.status === "closed"),
    [jobs]
  );
  const categories = useMemo(
    () =>
      [...new Set(visible.map((j) => j.category).filter((c): c is string => Boolean(c)))].sort(),
    [visible]
  );
  const [type, setType] = useState<EmploymentType | "all">("all");
  const [category, setCategory] = useState<string | "all">("all");

  const filtered = visible.filter(
    (j) =>
      (type === "all" || j.employmentType === type) &&
      (category === "all" || j.category === category)
  );

  if (!visible.length) {
    return (
      <p className="cy-empty">
        No open positions right now. Check back soon, or reach out via the{" "}
        <Link href="/#contact">Contact page</Link> to introduce yourself anyway.
      </p>
    );
  }

  return (
    <div className="cy-board">
      <div className="cy-filters" role="group" aria-label="Filter open positions">
        <div className="cy-filter-group">
          <span className="cy-filter-label">Type</span>
          <div className="cy-filter-chips">
            <FilterChip active={type === "all"} onClick={() => setType("all")}>
              All
            </FilterChip>
            {EMPLOYMENT_FILTERS.map((t) => (
              <FilterChip key={t} active={type === t} onClick={() => setType(t)}>
                {employmentTypeLabel(t)}
              </FilterChip>
            ))}
          </div>
        </div>
        {categories.length > 1 ? (
          <div className="cy-filter-group">
            <span className="cy-filter-label">Category</span>
            <div className="cy-filter-chips">
              <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
                All
              </FilterChip>
              {categories.map((c) => (
                <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </FilterChip>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {filtered.length ? (
        <ul className="cy-job-grid">
          {filtered.map((job) => (
            <JobCard job={job} key={job.id} />
          ))}
        </ul>
      ) : (
        <p className="cy-empty">No positions match those filters right now.</p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? "cy-chip is-active" : "cy-chip"}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
