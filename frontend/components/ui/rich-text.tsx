import { Fragment } from "react";
import type { RichText as RichTextValue } from "@/types/home";

/**
 * Renders the content model's inline segments as the exact elements the
 * reference uses (<b>, <em>, <br>, <span class="crimson">). No raw HTML is
 * ever injected, so CMS content can't smuggle markup through this path.
 */
export function RichText({ value }: { value: RichTextValue }) {
  return (
    <>
      {value.map((seg, i) => {
        if (typeof seg === "string") return <Fragment key={i}>{seg}</Fragment>;
        if ("b" in seg) return <b key={i}>{seg.b}</b>;
        if ("em" in seg) return <em key={i}>{seg.em}</em>;
        if ("crimson" in seg)
          return (
            <span key={i} className="crimson">
              {seg.crimson}
            </span>
          );
        return <br key={i} />;
      })}
    </>
  );
}

/** Lines joined with <br>, as the reference writes multi-line headings. */
export function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}

/** The cyan full stop / question mark the reference appends to display headings. */
export function Crimson({ children = "." }: { children?: string }) {
  return <span className="crimson">{children}</span>;
}
