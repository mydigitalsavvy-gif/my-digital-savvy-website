"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { ApplicationSuccess, EmploymentType, JobModel } from "@/types/careers";
import { EMPLOYMENT_TYPES, RESUME_ACCEPT, RESUME_MAX_BYTES } from "@/lib/careers/validation";
import { benefitsFromPortfolio, employmentTypeLabel, isEntryLevel } from "@/lib/careers/format";
import { CareersContact } from "./CareersContact";

type Status = "idle" | "submitting" | "success" | "error";

interface ApiError {
  message?: string;
  errors?: Record<string, string>;
  contactEmail?: string;
}

/**
 * Candidate application form — entirely separate from ConsultPopup (the
 * "Book a Free Audit" popup) and any business-enquiry flow. One instance
 * per job; the job is identified automatically from props, never asked.
 */
export function ApplicationForm({ job }: { job: JobModel }) {
  const formId = useId();
  const renderedAt = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showContactFallback, setShowContactFallback] = useState(false);
  const [success, setSuccess] = useState<ApplicationSuccess | null>(null);
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">(
    job.employmentType ?? ""
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const entryLevel = isEntryLevel(job.experienceRequired);
  const showPortfolioFirst = benefitsFromPortfolio(job);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    setFileName(null);
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "doc", "docx"].includes(ext)) {
      setFileError("Attach a PDF, DOC or DOCX file");
      e.target.value = "";
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      setFileError("Résumé must be 5MB or smaller");
      e.target.value = "";
      return;
    }
    setFileName(file.name);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return; // guards against double submission
    setStatus("submitting");
    setErrors({});
    setGeneralError(null);
    setShowContactFallback(false);

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    formData.set("jobId", job.id);
    formData.set("jobSlug", job.slug);
    formData.set("jobTitle", job.title);
    formData.set("employmentType", employmentType);
    const consentEl = formEl.elements.namedItem("consent");
    formData.set(
      "consent",
      consentEl instanceof HTMLInputElement && consentEl.checked ? "true" : "false"
    );
    formData.set("renderedAt", String(renderedAt.current));

    try {
      const res = await fetch("/api/careers/apply", { method: "POST", body: formData });
      const data = (await res.json()) as (ApiError & Partial<ApplicationSuccess>) & { ok: boolean };
      if (res.ok && data.ok) {
        setStatus("success");
        setSuccess({ applicationId: data.applicationId!, jobTitle: data.jobTitle ?? job.title });
        return;
      }
      setStatus("error");
      if (data.errors) setErrors(data.errors);
      setGeneralError(data.message ?? "That application couldn't be submitted. Please try again.");
      setShowContactFallback(Boolean(data.contactEmail));
    } catch {
      setStatus("error");
      setGeneralError("Network error. Please check your connection and try again.");
    }
  }

  if (status === "success" && success) {
    return (
      <div className="cy-form-success" role="status">
        <h3>Application received</h3>
        <p>
          Thanks for applying to <strong>{success.jobTitle}</strong>. Our team will review your
          application and reach out if it&apos;s a match. Keep an eye on your email and phone/WhatsApp.
        </p>
        <p className="label">Reference: {success.applicationId}</p>
      </div>
    );
  }

  const fieldId = (name: string) => `${formId}-${name}`;
  const errorId = (name: string) => (errors[name] ? `${formId}-${name}-error` : undefined);

  return (
    <form className="cy-form" onSubmit={onSubmit} noValidate aria-describedby={generalError ? `${formId}-general-error` : undefined}>
      {generalError ? (
        <div className="cy-form-error" role="alert" id={`${formId}-general-error`}>
          <p>{generalError}</p>
          {showContactFallback ? <CareersContact /> : null}
        </div>
      ) : null}

      {/* Honeypot — hidden from real visitors, never styled visible. */}
      <div className="cy-honeypot" aria-hidden="true">
        <label htmlFor={fieldId("company")}>Company</label>
        <input id={fieldId("company")} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="cy-field">
        <label htmlFor={fieldId("fullName")}>Full name *</label>
        <input
          id={fieldId("fullName")}
          name="fullName"
          type="text"
          required
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errorId("fullName")}
        />
        {errors.fullName ? (
          <span className="cy-field-error" id={errorId("fullName")}>
            {errors.fullName}
          </span>
        ) : null}
      </div>

      <div className="cy-field-row">
        <div className="cy-field">
          <label htmlFor={fieldId("email")}>Email address *</label>
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errorId("email")}
          />
          {errors.email ? (
            <span className="cy-field-error" id={errorId("email")}>
              {errors.email}
            </span>
          ) : null}
        </div>
        <div className="cy-field">
          <label htmlFor={fieldId("phone")}>Phone / WhatsApp number *</label>
          <input
            id={fieldId("phone")}
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errorId("phone")}
          />
          {errors.phone ? (
            <span className="cy-field-error" id={errorId("phone")}>
              {errors.phone}
            </span>
          ) : null}
        </div>
      </div>

      <div className="cy-field">
        <span className="cy-field-static-label">Employment type</span>
        {job.employmentType ? (
          <p className="cy-field-static-value">{employmentTypeLabel(job.employmentType)}</p>
        ) : (
          <select
            id={fieldId("employmentType")}
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            required
            aria-invalid={Boolean(errors.employmentType)}
          >
            <option value="">Select one</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {employmentTypeLabel(t)}
              </option>
            ))}
          </select>
        )}
        {errors.employmentType ? <span className="cy-field-error">{errors.employmentType}</span> : null}
      </div>

      <div className={showPortfolioFirst ? "cy-field-row cy-field-row-reverse" : "cy-field-row"}>
        <div className="cy-field">
          <label htmlFor={fieldId("experience")}>
            {entryLevel ? "Relevant experience (if any)" : "Total experience"}
          </label>
          <input
            id={fieldId("experience")}
            name="experience"
            type="text"
            placeholder={entryLevel ? "e.g. none, college projects, internships" : "e.g. 1.5 years"}
            aria-invalid={Boolean(errors.experience)}
            aria-describedby={errorId("experience")}
          />
          {errors.experience ? (
            <span className="cy-field-error" id={errorId("experience")}>
              {errors.experience}
            </span>
          ) : null}
        </div>
        <div className="cy-field">
          <label htmlFor={fieldId("portfolioUrl")}>Portfolio or LinkedIn URL</label>
          <input
            id={fieldId("portfolioUrl")}
            name="portfolioUrl"
            type="url"
            placeholder="https://"
            aria-invalid={Boolean(errors.portfolioUrl)}
            aria-describedby={errorId("portfolioUrl")}
          />
          {errors.portfolioUrl ? (
            <span className="cy-field-error" id={errorId("portfolioUrl")}>
              {errors.portfolioUrl}
            </span>
          ) : null}
        </div>
      </div>

      <div className="cy-field">
        <label htmlFor={fieldId("skills")}>Relevant skills</label>
        <textarea
          id={fieldId("skills")}
          name="skills"
          rows={2}
          placeholder="e.g. Canva, Premiere Pro, Meta Ads, copywriting…"
          aria-invalid={Boolean(errors.skills)}
          aria-describedby={errorId("skills")}
        />
        {errors.skills ? (
          <span className="cy-field-error" id={errorId("skills")}>
            {errors.skills}
          </span>
        ) : null}
      </div>

      <div className="cy-field">
        <label htmlFor={fieldId("resume")}>Résumé / CV (PDF, DOC or DOCX, max 5MB) *</label>
        <input
          ref={fileInputRef}
          id={fieldId("resume")}
          name="resume"
          type="file"
          accept={RESUME_ACCEPT}
          required
          onChange={onFileChange}
          aria-invalid={Boolean(fileError || errors.resume)}
          aria-describedby={fileError || errors.resume ? `${formId}-resume-error` : undefined}
        />
        {fileName && !fileError ? <span className="cy-field-hint">{fileName}</span> : null}
        {fileError || errors.resume ? (
          <span className="cy-field-error" id={`${formId}-resume-error`}>
            {fileError || errors.resume}
          </span>
        ) : null}
      </div>

      <div className="cy-field">
        <label htmlFor={fieldId("coverLetter")}>Cover letter or message (optional)</label>
        <textarea
          id={fieldId("coverLetter")}
          name="coverLetter"
          rows={4}
          aria-invalid={Boolean(errors.coverLetter)}
          aria-describedby={errorId("coverLetter")}
        />
        {errors.coverLetter ? (
          <span className="cy-field-error" id={errorId("coverLetter")}>
            {errors.coverLetter}
          </span>
        ) : null}
      </div>

      <label className="cy-consent">
        <input type="checkbox" name="consent" required />
        <span>
          I consent to My Digital Savvy storing and reviewing these details for this hiring
          process. *
        </span>
      </label>
      {errors.consent ? <span className="cy-field-error">{errors.consent}</span> : null}

      <button type="submit" className="btn solid" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : `Apply for ${job.title}`}
      </button>
    </form>
  );
}
