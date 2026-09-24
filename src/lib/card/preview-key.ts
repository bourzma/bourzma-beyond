import { timingSafeEqual } from "node:crypto";

/** Headers for testing endpoints that may return personal data. */
export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

/**
 * Checks the ?key= of a testing endpoint against CARD_PREVIEW_KEY.
 * "disabled" when no key is configured, so the endpoint can answer 404.
 */
export function checkPreviewKey(request: Request): "ok" | "disabled" | "unauthorized" {
  const expected = process.env.CARD_PREVIEW_KEY;
  if (!expected) return "disabled";
  const given = new URL(request.url).searchParams.get("key");
  if (!given) return "unauthorized";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "unauthorized";
}
