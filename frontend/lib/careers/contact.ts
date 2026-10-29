/**
 * Careers-specific contact details — deliberately separate from the
 * sitewide contact info in content/home.ts (ContactContent.email/
 * whatsappNumber), which is a different number used by ConsultPopup and
 * the general Contact page. HR's details are only used on the Careers
 * section, so they're centralized once here rather than hardcoded at
 * each call site.
 */

export const CAREERS_CONTACT = {
  email: "hr@mydigitalsavvy.com",
  /** Local 10-digit number, as supplied. */
  phoneLocal: "7378842121",
  /** E.164 with India's country code, for tel:/wa.me links. */
  phoneIntl: "+917378842121",
  /** Human-readable, for display only. */
  phoneDisplay: "+91 73788 42121",
  whatsappNumber: "917378842121",
} as const;

export function careersMailtoHref(subject?: string): string {
  return subject
    ? `mailto:${CAREERS_CONTACT.email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CAREERS_CONTACT.email}`;
}

export function careersTelHref(): string {
  return `tel:${CAREERS_CONTACT.phoneIntl}`;
}

export function careersWhatsAppHref(message?: string): string {
  const base = `https://wa.me/${CAREERS_CONTACT.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
