"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CareersContact } from "./CareersContact";

type Status = "idle" | "submitting" | "success" | "error";

interface ApiResponse {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  enquiryId?: string;
  contactEmail?: string;
}

/**
 * White-label / agency partnership enquiry. Entirely separate from the job
 * ApplicationForm and from ConsultPopup — its own state, its own route
 * (/api/careers/partnership), its own storage on the WordPress side.
 */
export function PartnershipForm() {
  const formId = useId();
  const renderedAt = useRef(0);
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showContactFallback, setShowContactFallback] = useState(false);
  const [enquiryId, setEnquiryId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrors({});
    setGeneralError(null);
    setShowContactFallback(false);

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const consentEl = formEl.elements.namedItem("consent");
    formData.set(
      "consent",
      consentEl instanceof HTMLInputElement && consentEl.checked ? "true" : "false"
    );
    formData.set("renderedAt", String(renderedAt.current));

    try {
      const res = await fetch("/api/careers/partnership", { method: "POST", body: formData });
      const data = (await res.json()) as ApiResponse;
      if (res.ok && data.ok) {
        setStatus("success");
        setEnquiryId(data.enquiryId ?? null);
        return;
      }
      setStatus("error");
      if (data.errors) setErrors(data.errors);
      setGeneralError(data.message ?? "That enquiry couldn't be submitted. Please try again.");
      setShowContactFallback(Boolean(data.contactEmail));
    } catch {
      setStatus("error");
      setGeneralError("Network error. Please check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="cy-form-success" role="status">
        <h3>Enquiry received</h3>
        <p>
          Thanks for reaching out. Our team will review your enquiry and get back to you about
          working together.
        </p>
        {enquiryId ? <p className="label">Reference: {enquiryId}</p> : null}
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

      <div className="cy-honeypot" aria-hidden="true">
        <label htmlFor={fieldId("company")}>Company</label>
        <input id={fieldId("company")} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="cy-field-row">
        <div className="cy-field">
          <label htmlFor={fieldId("agencyName")}>Agency / business name *</label>
          <input
            id={fieldId("agencyName")}
            name="agencyName"
            type="text"
            required
            aria-invalid={Boolean(errors.agencyName)}
            aria-describedby={errorId("agencyName")}
          />
          {errors.agencyName ? (
            <span className="cy-field-error" id={errorId("agencyName")}>
              {errors.agencyName}
            </span>
          ) : null}
        </div>
        <div className="cy-field">
          <label htmlFor={fieldId("contactName")}>Contact person&apos;s name *</label>
          <input
            id={fieldId("contactName")}
            name="contactName"
            type="text"
            required
            autoComplete="name"
            aria-invalid={Boolean(errors.contactName)}
            aria-describedby={errorId("contactName")}
          />
          {errors.contactName ? (
            <span className="cy-field-error" id={errorId("contactName")}>
              {errors.contactName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="cy-field-row">
        <div className="cy-field">
          <label htmlFor={fieldId("workEmail")}>Work email *</label>
          <input
            id={fieldId("workEmail")}
            name="workEmail"
            type="email"
            required
            autoComplete="email"
            aria-invalid={Boolean(errors.workEmail)}
            aria-describedby={errorId("workEmail")}
          />
          {errors.workEmail ? (
            <span className="cy-field-error" id={errorId("workEmail")}>
              {errors.workEmail}
            </span>
          ) : null}
        </div>
        <div className="cy-field">
          <label htmlFor={fieldId("phone")}>Phone / WhatsApp *</label>
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
        <label htmlFor={fieldId("servicesRequired")}>Services required *</label>
        <textarea
          id={fieldId("servicesRequired")}
          name="servicesRequired"
          rows={2}
          required
          placeholder="e.g. SEO, social media management, paid ads, website development…"
          aria-invalid={Boolean(errors.servicesRequired)}
          aria-describedby={errorId("servicesRequired")}
        />
        {errors.servicesRequired ? (
          <span className="cy-field-error" id={errorId("servicesRequired")}>
            {errors.servicesRequired}
          </span>
        ) : null}
      </div>

      <div className="cy-field">
        <label htmlFor={fieldId("estimatedVolume")}>Estimated monthly / project volume (optional)</label>
        <input
          id={fieldId("estimatedVolume")}
          name="estimatedVolume"
          type="text"
          placeholder="e.g. 3-5 client projects per month"
          aria-invalid={Boolean(errors.estimatedVolume)}
          aria-describedby={errorId("estimatedVolume")}
        />
        {errors.estimatedVolume ? (
          <span className="cy-field-error" id={errorId("estimatedVolume")}>
            {errors.estimatedVolume}
          </span>
        ) : null}
      </div>

      <div className="cy-field">
        <label htmlFor={fieldId("message")}>Message / project details (optional)</label>
        <textarea
          id={fieldId("message")}
          name="message"
          rows={4}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errorId("message")}
        />
        {errors.message ? (
          <span className="cy-field-error" id={errorId("message")}>
            {errors.message}
          </span>
        ) : null}
      </div>

      <label className="cy-consent">
        <input type="checkbox" name="consent" required />
        <span>I consent to My Digital Savvy storing and reviewing these details to follow up on this enquiry. *</span>
      </label>
      {errors.consent ? <span className="cy-field-error">{errors.consent}</span> : null}

      <button type="submit" className="btn solid" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
