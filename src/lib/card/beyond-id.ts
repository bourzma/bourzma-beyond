import { createHash } from "node:crypto";

// Crockford base32: no I, L, O or U, so IDs are easy to read aloud and type.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const BEYOND_ID_PATTERN = /^BYD-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/**
 * A Beyond ID such as "BYD-7K3Q-9XMA", derived from the Typeform response
 * token. Unique per submission (40 bits) and stable: a retried webhook for
 * the same submission gets the same ID, so its card is simply replaced.
 */
export function beyondIdFor(responseToken: string): string {
  if (!responseToken) throw new Error("A response token is required for a Beyond ID");
  const hash = createHash("sha256").update(`bourzma-beyond:${responseToken}`).digest();
  // 40 bits (5 bytes) fit exactly in 8 base32 characters and in a JS number.
  let bits = 0;
  for (const byte of hash.subarray(0, 5)) bits = bits * 256 + byte;
  let code = "";
  for (let i = 0; i < 8; i++) {
    code = ALPHABET[bits % 32] + code;
    bits = Math.floor(bits / 32);
  }
  return `BYD-${code.slice(0, 4)}-${code.slice(4)}`;
}

export function isBeyondId(value: unknown): value is string {
  return typeof value === "string" && BEYOND_ID_PATTERN.test(value);
}
