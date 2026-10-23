"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { PopupContent } from "@/types/home";
import { Lines } from "@/components/ui/rich-text";
import { track } from "@/lib/analytics/track";

const DONE_KEY = "mds_consult_done";
const DISMISS_KEY = "mds_consult_dismissed";

const store = {
  isDone: () => {
    try {
      return localStorage.getItem(DONE_KEY) === "1";
    } catch {
      return false;
    }
  },
  markDone: () => {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {}
  },
  wasDismissed: () => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  },
  markDismissed: () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  },
};

/**
 * Port of the reference consult popup:
 *  - every primary audit CTA (a.btn.solid → #contact / #audit) opens it
 *    instead of jumping, unless the visitor already converted
 *  - one-time nudge 20s after load, skipped if converted/dismissed/open
 *  - Escape and overlay close it (and stop the nudge for the session),
 *    Tab is trapped, focus returns to where it was
 *  - submit opens a pre-filled WhatsApp chat
 *
 * LEAD SYSTEM FLAG: like the reference, nothing is stored server-side yet
 * and the visitor is marked "done" when WhatsApp opens. The planned
 * Server Action + Postgres flow replaces the submit handler; the old
 * CTA-click Meta "Lead" event is intentionally not ported.
 */
export function ConsultPopup({ popup }: { popup: PopupContent }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<Element | null>(null);
  const openRef = useRef(false);

  const openPopup = useCallback(() => {
    if (store.isDone() || openRef.current) return;
    lastFocused.current = document.activeElement;
    openRef.current = true;
    setOpen(true);
  }, []);

  const closePopup = useCallback((dismissed: boolean) => {
    openRef.current = false;
    setOpen(false);
    const el = lastFocused.current as HTMLElement | null;
    if (el && typeof el.focus === "function") el.focus();
    if (dismissed) store.markDismissed();
  }, []);

  // focus the first field on open
  useEffect(() => {
    if (!open) return;
    popupRef.current?.querySelector<HTMLElement>("input, select")?.focus();
  }, [open]);

  // Escape + focus trap while open
  useEffect(() => {
    if (!open) return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePopup(true);
        return;
      }
      if (e.key === "Tab" && popupRef.current) {
        const f = popupRef.current.querySelectorAll<HTMLElement>(
          "button, input, select, a[href]"
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [open, closePopup]);

  // CTA interception (delegated, so client-rendered CTAs are covered too)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a.btn.solid");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!/#(contact|audit)$/.test(href)) return;
      if (store.isDone()) return; // returning converter: plain anchor jump
      e.preventDefault();
      openPopup();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [openPopup]);

  // one-time nudge
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (store.isDone() || store.wasDismissed() || openRef.current) return;
      openPopup();
    }, 20000);
    return () => window.clearTimeout(t);
  }, [openPopup]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const need = String(data.get("need") ?? "");
    if (!name || !phone) {
      setNote("Please add your name and number.");
      return;
    }
    const msg = `Hi, I'm ${name}. I'd like a free audit call about ${need}. My number: ${phone}`;
    const url = `https://wa.me/${popup.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    track("whatsapp_lead_handoff", { need });
    store.markDone();
    window.open(url, "_blank", "noopener");
    setNote("Opening WhatsApp — see you there.");
    window.setTimeout(() => closePopup(false), 900);
  };

  return (
    <>
      <div
        className="mds-popup-overlay"
        id="mdsOverlay"
        hidden={!open}
        onClick={() => closePopup(true)}
      ></div>
      <div
        ref={popupRef}
        className="mds-popup"
        id="mdsPopup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mdsPopupTitle"
        hidden={!open}
      >
        <button
          type="button"
          className="mds-popup-close"
          id="mdsPopupClose"
          aria-label="Close"
          onClick={() => closePopup(true)}
        >
          ✕
        </button>
        <span className="label">{popup.label}</span>
        <h3 id="mdsPopupTitle" className="display">
          <Lines lines={popup.titleLines} />
          <span className="crimson">?</span>
        </h3>
        <p className="mds-popup-copy">{popup.copy}</p>

        <form id="mdsPopupForm" noValidate onSubmit={onSubmit}>
          <label className="mds-field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              id="mdsName"
              autoComplete="name"
              required
            />
          </label>
          <label className="mds-field">
            <span>WhatsApp number</span>
            <input
              type="tel"
              name="phone"
              id="mdsPhone"
              autoComplete="tel"
              inputMode="tel"
              required
            />
          </label>
          <label className="mds-field">
            <span>What do you need?</span>
            <select name="need" id="mdsNeed">
              {popup.needs.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn solid mds-popup-submit">
            {popup.submitLabel}
          </button>
          <p
            className="mds-popup-note"
            id="mdsPopupNote"
            role="status"
            aria-live="polite"
          >
            {note}
          </p>
        </form>
      </div>
    </>
  );
}
