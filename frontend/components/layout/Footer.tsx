import type { FooterContent } from "@/types/home";
import { AnimatedLogo } from "@/components/interactions/AnimatedLogo";

export function Footer({ footer }: { footer: FooterContent }) {
  return (
    <footer className="wrap">
      <div className="footer-brand">
        <AnimatedLogo
          canvasClassName="footer-logo-canvas"
          videoId="footerLogoVideo"
          canvasId="footerLogoCanvas"
          onDark
        />
        <span className="label">{footer.copyright}</span>
      </div>
      <div className="footer-social">
        {footer.social.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener"
            className="label"
          >
            {s.label}
          </a>
        ))}
      </div>
      <span className="label">{footer.tagline}</span>
    </footer>
  );
}
