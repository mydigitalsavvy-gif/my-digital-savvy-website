import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time secret comparison. Unset expected secret → always false. */
export function secretMatches(
  provided: string | null | undefined,
  expected: string | undefined
): boolean {
  if (!expected || !provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
