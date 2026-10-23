/**
 * Homepage content model. Every section component consumes one slice of
 * this shape and nothing else, so the source can move from the static
 * reference content (content/home.ts) to a WordPress adapter later without
 * touching a single component.
 */

/** Brand colour slot, rendered as `--c: var(--<slot>)` exactly like the reference. */
export type AccentSlot = "dot" | "green" | "blue" | "magenta";

/**
 * Inline rich text without raw HTML. A plain string is text; the object
 * forms map 1:1 to the reference's <b>, <em>, <br> and the cyan full stop
 * (<span class="crimson">).
 */
export type RichSegment =
  string | { b: string } | { em: string } | { br: true } | { crimson: string };
export type RichText = RichSegment[];

export interface Link {
  label: string;
  href: string;
}

export interface NavContent {
  homeHref: string;
  links: { home: Link; services: Link; about: Link; blog: Link; contact: Link };
  cta: Link;
  megaLabel: string;
  megaTitle: string;
}

export interface HeroContent {
  eyebrow: string;
  headlineLead: string;
  /** Rotating word list; `color` is the exact hex the reference rotor uses. */
  rotorWords: { word: string; color: string }[];
  rotorInitialLabel: string;
  sub: RichText;
  primaryCta: Link;
  secondaryCta: Link;
}

export interface ResultFact {
  /** Count-up target. `null` renders `display` as a static value instead. */
  countTo: number | null;
  display?: string;
  suffix: "+" | "%" | "";
  label: string;
}

export interface ResultsContent {
  heading: string;
  label: string;
  facts: ResultFact[];
  note: string;
}

export interface ServiceIcon {
  /** Raw SVG child elements, as structured data (no innerHTML). */
  shapes: SvgShape[];
}

export type SvgShape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
      fill?: boolean;
      transform?: string;
    }
  | { type: "circle"; cx: number; cy: number; r: number; fill?: boolean }
  | {
      type: "path";
      d: string;
      fill?: boolean;
      strokeLinecap?: "round";
      strokeLinejoin?: "round";
    };

export interface Service {
  slug: string;
  number: string;
  /** Short name used by the mega menu and mobile drawer. */
  name: string;
  /** Mega menu one-liner. */
  menuDescription: string;
  /** Mega menu tile colour. The reference cycles dot/green/blue/magenta here,
      which differs from the panel colour for services 07 and 08. */
  menuColor: AccentSlot;
  color: AccentSlot;
  /** Panel title lines, joined with <br> like the reference. */
  titleLines: string[];
  sub: string;
  how: string;
  deliverables: string[];
  outcome: string;
  cta: Link;
  caseLink: Link;
  icon: ServiceIcon;
}

export interface ServicesContent {
  heading: string;
  label: string;
  menuHref: string;
  items: Service[];
}

export interface ThinkContent {
  headingLines: string[];
  paragraphs: RichText[];
  note: string;
}

export interface GrowthStage {
  railLabel: string;
  title: string;
  body: string;
  color: AccentSlot;
}

export interface GrowthContent {
  label: string;
  heading: string;
  stages: GrowthStage[];
}

export interface IndustriesContent {
  heading: string;
  label: string;
  items: { tag: string; clients: string; color: AccentSlot }[];
}

/** The portfolio solar system that replaced the Selected Work list. */
export interface WorkContent {
  heading: string;
  label: string;
  /** where every click on the system goes */
  href: string;
  /** the visible call to action on the system, and its accessible name */
  cta: string;
  ariaLabel: string;
  /** small caption before the live date */
  live: string;
}

export interface CaseStudiesContent {
  heading: string;
  label: string;
  badge: string;
  steps: { label: string; text: string }[];
  cta: Link;
}

export interface AboutContent {
  heading: string;
  label: string;
  lead: string;
  /** CONFIRM: flagged in the reference as needing verification before launch. */
  pullValue: string;
  pullSuffix: string;
  pullLabelLines: string[];
  note: RichText;
}

export interface BlogPreviewContent {
  heading: string;
  label: string;
  intro: string;
  cta: Link;
}

export interface ProcessContent {
  heading: string;
  label: string;
  steps: { number: string; title: string; body: string }[];
}

export interface Testimonial {
  quote: RichText;
  name: string;
  source: string;
}

export interface ProofContent {
  heading: string;
  label: string;
  featured: Testimonial;
  rating: {
    value: string;
    reviewCount: number;
    /** CONFIRM: the reference still carries a placeholder Google review link. */
    href: string;
    ariaLabel: string;
    textBefore: string;
    textAfter: string;
  };
  voices: Testimonial[];
  marqueeNames: string[];
}

export interface WhyContent {
  heading: string;
  label: string;
  ariaLabel: string;
  items: { title: string; body: string; color: AccentSlot }[];
  cta: Link;
}

export interface AuditContent {
  label: string;
  heading: string;
  copy: string;
  cta: Link;
}

export interface ContactContent {
  label: string;
  headingLines: string[];
  email: string;
  whatsappDisplay: string;
  whatsappNumber: string;
  offices: { label: string; lines: string[] }[];
}

export interface FooterContent {
  copyright: string;
  social: Link[];
  tagline: string;
}

export interface PopupContent {
  label: string;
  titleLines: string[];
  copy: string;
  needs: string[];
  submitLabel: string;
  whatsappNumber: string;
}

export interface HomeContent {
  nav: NavContent;
  hero: HeroContent;
  clients: string[];
  results: ResultsContent;
  services: ServicesContent;
  think: ThinkContent;
  growth: GrowthContent;
  industries: IndustriesContent;
  work: WorkContent;
  caseStudies: CaseStudiesContent;
  about: AboutContent;
  blog: BlogPreviewContent;
  process: ProcessContent;
  proof: ProofContent;
  why: WhyContent;
  audit: AuditContent;
  contact: ContactContent;
  footer: FooterContent;
  popup: PopupContent;
}
