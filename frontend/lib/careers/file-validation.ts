import "server-only";
import {
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_MAX_BYTES,
} from "./validation";

/**
 * Résumé file checks that don't trust the filename or the browser-supplied
 * MIME type — both are trivially spoofable. Reads the first bytes and
 * matches real file signatures instead. This is re-run server-side by the
 * WordPress plugin too (never trust the Next.js layer either); this check
 * exists to reject obviously-wrong uploads early and give a fast, clear
 * error instead of forwarding junk.
 */

export interface FileCheckResult {
  ok: boolean;
  error?: string;
  extension?: string;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

function matchesSignature(bytes: Uint8Array, extension: string): boolean {
  // %PDF-
  const isPdf =
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;
  // DOCX is a zip archive: "PK\x03\x04"
  const isZip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  // Legacy .doc: OLE compound file signature
  const isOle =
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1;

  if (extension === "pdf") return isPdf;
  if (extension === "docx") return isZip;
  if (extension === "doc") return isOle || isZip; // some "legacy" .doc are actually OOXML
  return false;
}

export async function checkResumeFile(file: File): Promise<FileCheckResult> {
  if (file.size === 0) return { ok: false, error: "The résumé file is empty" };
  if (file.size > RESUME_MAX_BYTES) {
    return { ok: false, error: "Résumé must be 5MB or smaller" };
  }
  const extension = extensionOf(file.name);
  if (!RESUME_ALLOWED_EXTENSIONS.includes(extension)) {
    return { ok: false, error: "Résumé must be a PDF, DOC or DOCX file" };
  }
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!matchesSignature(head, extension)) {
    return {
      ok: false,
      error: "That file doesn't look like a valid PDF/DOC/DOCX. Try re-saving and uploading again.",
    };
  }
  return { ok: true, extension };
}
