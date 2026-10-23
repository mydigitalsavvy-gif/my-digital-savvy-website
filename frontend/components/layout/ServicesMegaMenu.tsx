"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Link, Service } from "@/types/home";
import { accentStyle } from "@/components/ui/accent";

type MegaState = {
  open: boolean;
  origin: { x: number; y: number } | null;
  openAt: (x: number, y: number) => void;
  close: (restoreFocus?: boolean) => void;
  triggerRef: React.RefObject<HTMLAnchorElement | null>;
};

const MegaContext = createContext<MegaState | null>(null);

function useMega() {
  const ctx = useContext(MegaContext);
  if (!ctx)
    throw new Error("Mega menu parts must sit inside <MegaMenuProvider>");
  return ctx;
}

/**
 * Shares open state between the "Services" trigger (inside the centred
 * nav) and the full-screen takeover (end of <header>). Renders no DOM of
 * its own, so the header's grid children are exactly the reference's.
 */
export function MegaMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLAnchorElement | null>(null);

  const openAt = useCallback((x: number, y: number) => {
    setOrigin({ x, y });
    setOpen(true);
    document.documentElement.style.overflow = "hidden";
  }, []);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    document.documentElement.style.overflow = "";
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const value = useMemo(
    () => ({ open, origin, openAt, close, triggerRef }),
    [open, origin, openAt, close]
  );
  return <MegaContext.Provider value={value}>{children}</MegaContext.Provider>;
}

/** The "Services" link. Real href so it still works before hydration. */
export function MegaTrigger({ link }: { link: Link }) {
  const { open, openAt, close, triggerRef } = useMega();
  return (
    <a
      ref={triggerRef}
      href={link.href}
      id="megaTrigger"
      aria-expanded={open ? "true" : "false"}
      aria-controls="megaMenu"
      onClick={(e) => {
        e.preventDefault();
        if (open) {
          close();
        } else {
          const r = e.currentTarget.getBoundingClientRect();
          openAt(r.left + r.width / 2, r.bottom);
        }
      }}
    >
      {link.label}
    </a>
  );
}

export function ServicesMegaMenu({
  label,
  title,
  services,
  servicesHref,
  cta,
}: {
  label: string;
  title: string;
  services: Service[];
  servicesHref: string;
  cta: Link;
}) {
  const { open, origin, close } = useMega();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button once the takeover opens, like the reference.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onResize = () => {
      if (window.innerWidth <= 860) close(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  const style = origin
    ? ({ "--ox": `${origin.x}px`, "--oy": `${origin.y}px` } as CSSProperties)
    : undefined;

  return (
    // Was role="menu" in the reference; a full-screen takeover of links is a
    // dialog for assistive tech. No visual difference.
    <div
      className={open ? "mega-menu is-open" : "mega-menu"}
      id="megaMenu"
      role="dialog"
      aria-modal="true"
      aria-label="Services"
      aria-hidden={open ? undefined : "true"}
      inert={!open}
      style={style}
    >
      <button
        ref={closeRef}
        className="mega-close"
        id="megaClose"
        type="button"
        aria-label="Close menu"
        onClick={() => close()}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="mega-inner">
        <div className="mega-head">
          <span className="label">{label}</span>
          <h2>{title}</h2>
        </div>
        <div className="mega-grid">
          {services.map((s) => (
            <a
              key={s.slug}
              href={servicesHref}
              className="mega-link"
              style={accentStyle(s.menuColor)}
              onClick={() => close(false)}
            >
              <span className="mega-num">{s.number}</span>
              <span className="mega-title">{s.name}</span>
              <span className="mega-desc">{s.menuDescription}</span>
            </a>
          ))}
        </div>
        <a
          href={cta.href}
          className="btn solid mega-cta"
          onClick={() => close(false)}
        >
          {cta.label}
        </a>
      </div>
    </div>
  );
}
