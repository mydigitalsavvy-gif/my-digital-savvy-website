import type { NavContent, Service } from "@/types/home";
import { AnimatedLogo } from "@/components/interactions/AnimatedLogo";
import { MobileNav } from "./MobileNav";
import {
  MegaMenuProvider,
  MegaTrigger,
  ServicesMegaMenu,
} from "./ServicesMegaMenu";

/**
 * Site chrome, server-rendered. Mirrors the reference <header> child order
 * exactly (logo, nav, CTA, burger, drawer, mega menu) because the CSS grid
 * and absolute positioning depend on it. Only the menus hydrate.
 */
export function Header({
  nav,
  services,
  servicesHref,
}: {
  nav: NavContent;
  services: Service[];
  servicesHref: string;
}) {
  return (
    <header>
      <MegaMenuProvider>
        <a
          href={nav.homeHref}
          className="site-logo"
          aria-label="My Digital Savvy — home"
        >
          <AnimatedLogo
            canvasClassName="site-logo-canvas"
            videoId="siteLogoVideo"
            canvasId="siteLogoCanvas"
          />
        </a>

        <nav className="nav" id="nav" aria-label="Main navigation">
          <div className="nav-links">
            <a href={nav.links.home.href}>{nav.links.home.label}</a>
            <div className="nav-item">
              <MegaTrigger link={nav.links.services} />
            </div>
            <a href={nav.links.about.href}>{nav.links.about.label}</a>
            <a href={nav.links.blog.href}>{nav.links.blog.label}</a>
            <a href={nav.links.contact.href}>{nav.links.contact.label}</a>
          </div>
        </nav>

        <a href={nav.cta.href} className="btn solid nav-cta">
          {nav.cta.label}
        </a>

        <MobileNav nav={nav} services={services} servicesHref={servicesHref} />

        <ServicesMegaMenu
          label={nav.megaLabel}
          title={nav.megaTitle}
          services={services}
          servicesHref={servicesHref}
          cta={nav.cta}
        />
      </MegaMenuProvider>
    </header>
  );
}
