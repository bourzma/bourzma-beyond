import { createHmac, timingSafeEqual } from "node:crypto";
import { FIELD_REFS, type FieldRef } from "./scoring";

/** The parts of a Typeform webhook payload that this app reads. */
export interface TypeformWebhookPayload {
  form_response?: {
    token?: string;
    answers?: Array<{
      type?: string;
      number?: number;
      field?: { ref?: string };
    }>;
  };
}

/**
 * Pulls the numeric answer for each known field ref out of a Typeform
 * payload. Validation happens later in parseAnswers().
 */
export function extractAnswers(
  payload: TypeformWebhookPayload,
): Partial<Record<FieldRef, unknown>> {
  const extracted: Partial<Record<FieldRef, unknown>> = {};
  for (const answer of payload.form_response?.answers ?? []) {
    const ref = answer.field?.ref;
    if (ref && (FIELD_REFS as readonly string[]).includes(ref)) {
      extracted[ref as FieldRef] = answer.number;
    }
  }
  return extracted;
}

/**
 * Checks the `Typeform-Signature` header: "sha256=" followed by the base64
 * HMAC-SHA256 of the raw request body, keyed with the webhook secret.
 */
export function verifyTypeformSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("base64")}`;
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
