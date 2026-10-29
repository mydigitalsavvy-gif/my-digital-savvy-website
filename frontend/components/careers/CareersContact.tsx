import {
  CAREERS_CONTACT,
  careersMailtoHref,
  careersTelHref,
  careersWhatsAppHref,
} from "@/lib/careers/contact";

/** Email / call / WhatsApp links for HR — accessible, mobile-friendly, reused everywhere Careers needs a direct-contact fallback. */
export function CareersContact({
  whatsappMessage,
  className,
}: {
  whatsappMessage?: string;
  className?: string;
}) {
  return (
    <ul className={className ? `cy-contact-links ${className}` : "cy-contact-links"}>
      <li>
        <a href={careersMailtoHref()}>{CAREERS_CONTACT.email}</a>
      </li>
      <li>
        <a href={careersTelHref()}>{CAREERS_CONTACT.phoneDisplay}</a>
      </li>
      <li>
        <a
          href={careersWhatsAppHref(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp HR
        </a>
      </li>
    </ul>
  );
}
