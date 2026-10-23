import type { ContactContent } from "@/types/home";
import { Crimson, Lines } from "@/components/ui/rich-text";
import { LottieVisual } from "@/components/interactions/LottieVisual";

export function Contact({ contact }: { contact: ContactContent }) {
  return (
    <section
      className="wrap contact"
      id="contact"
      aria-labelledby="contact-heading"
    >
      <div className="contact-top">
        <div className="reveal">
          <span className="label">{contact.label}</span>
          <h2 id="contact-heading" className="display">
            <Lines lines={contact.headingLines} />
            <Crimson />
          </h2>
        </div>
        {/* your message reaches our office; a reply is already typing */}
        <LottieVisual
          className="contact-visual"
          name="contact-reach"
          still={175}
          width={340}
          height={240}
        />
      </div>
      <div className="cgrid reveal-group">
        <div>
          <span className="label">Email</span>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
        <div>
          <span className="label">WhatsApp</span>
          <a
            href={`https://wa.me/${contact.whatsappNumber}`}
            target="_blank"
            rel="noopener"
          >
            {contact.whatsappDisplay}
          </a>
        </div>
        {contact.offices.map((o) => (
          <div key={o.label}>
            <span className="label">{o.label}</span>
            <p>
              <Lines lines={o.lines} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
