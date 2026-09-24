import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProfessionalContext } from "./matching";
import { FIELD_REFS, type FieldRef } from "./scoring";

interface TypeformAnswer {
  type?: string;
  number?: number;
  text?: string;
  /** Single choice and dropdown questions. */
  choice?: { label?: string; other?: string };
  /** Multiple choice questions with several selections allowed. */
  choices?: { labels?: string[]; other?: string };
  field?: { ref?: string };
}

/** The parts of a Typeform webhook payload that this app reads. */
export interface TypeformWebhookPayload {
  form_response?: {
    token?: string;
    answers?: TypeformAnswer[];
  };
}

/** Typeform field refs of the professional questions used for matching. */
export const PROFESSIONAL_FIELD_REFS = {
  workplaceType: "Workplace_type",
  workArea: "Work_area",
  industry: "Industry",
  lookingFor: "Looking_for",
} as const satisfies Record<keyof ProfessionalContext, string>;

/** Every selected label (plus any "Other" text) of one answer. */
function answerValues(answer: TypeformAnswer): string[] {
  const values = [
    answer.choice?.label,
    answer.choice?.other,
    ...(answer.choices?.labels ?? []),
    answer.choices?.other,
    answer.text,
  ];
  return values.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

/** Reads the professional answers; missing questions become empty lists. */
export function extractProfessionalContext(
  payload: TypeformWebhookPayload,
): ProfessionalContext {
  const answers = payload.form_response?.answers ?? [];
  const valuesFor = (ref: string) =>
    answers.filter((a) => a.field?.ref === ref).flatMap(answerValues);
  return {
    workplaceType: valuesFor(PROFESSIONAL_FIELD_REFS.workplaceType),
    workArea: valuesFor(PROFESSIONAL_FIELD_REFS.workArea),
    industry: valuesFor(PROFESSIONAL_FIELD_REFS.industry),
    lookingFor: valuesFor(PROFESSIONAL_FIELD_REFS.lookingFor),
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
