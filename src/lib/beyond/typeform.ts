import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProfessionalContext } from "./matching";
import { FIELD_REFS, type FieldRef } from "./scoring";

interface TypeformAnswer {
  type?: string;
  number?: number;
  text?: string;
  email?: string;
  url?: string;
  /** Yes/No and Legal questions. */
  boolean?: boolean;
  /** Single choice and dropdown questions. */
  choice?: { label?: string; other?: string };
  /** Multiple choice questions with several selections allowed. */
  choices?: { labels?: string[]; other?: string };
  field?: { ref?: string };
}

/** The parts of a Typeform webhook payload that this app reads. */
export interface TypeformWebhookPayload {
  event_id?: string;
  form_response?: {
    form_id?: string;
    token?: string;
    submitted_at?: string;
    answers?: TypeformAnswer[];
  };
}

/** Typeform field refs of the contact questions. Never used for matching. */
export const CONTACT_FIELD_REFS = {
  /** Single full-name question (preferred). "Full_name" is accepted too. */
  name: "Name",
  /** Older two-question version, still supported. */
  firstName: "First_name",
  lastName: "Last_name",
  company: "Company",
  role: "Role",
  email: "Email",
  linkedin: "Linkedin",
  marketingConsent: "Marketing_consent",
} as const;

export interface ContactDetails {
  /**
   * The name as shown on the Beyond Card: the single Name question, or
   * First_name + Last_name joined when the form still asks them separately.
   */
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  email: string | null;
  linkedin: string | null;
  /**
   * true/false from a Yes/No or Legal question; null if unanswered or asked
   * with another question type (then check `marketingConsentRaw`).
   */
  marketingConsent: boolean | null;
  /** The consent answer as text, whatever the question type. */
  marketingConsentRaw: string | null;
}

/** Typeform field refs of the professional questions used for matching. */
export const PROFESSIONAL_FIELD_REFS = {
  lookingFor: "Looking_for",
  workplaceType: "Workplace_type",
} as const satisfies Record<keyof ProfessionalContext, string>;

/**
 * The exact answer options of the two single-choice professional questions,
 * as configured in Typeform. Project relevance lists may only use these.
 */
export const LOOKING_FOR_OPTIONS = [
  "New collaborations",
  "Creative partners",
  "Brands",
  "Clients",
  "Event opportunities",
  "Designers & creators",
  "Production",
  "Marketing & communication",
  "Sustainability projects",
  "Inspiration",
  "New people",
  "Something unexpected",
] as const;

export const WORKPLACE_TYPE_OPTIONS = [
  "Brand / Company",
  "Creative / Advertising Agency",
  "Media Agency",
  "PR / Communications Agency",
  "Event Agency",
  "Design Studio",
  "Startup",
  "Public Sector / Organisation",
  "Freelance / Independent",
  "Other",
] as const;

export type LookingForOption = (typeof LOOKING_FOR_OPTIONS)[number];
export type WorkplaceTypeOption = (typeof WORKPLACE_TYPE_OPTIONS)[number];

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
    lookingFor: valuesFor(PROFESSIONAL_FIELD_REFS.lookingFor),
    workplaceType: valuesFor(PROFESSIONAL_FIELD_REFS.workplaceType),
  };
}

/** The answer to a text-like question (short text, email, website). */
function answerText(answer: TypeformAnswer | undefined): string | null {
  if (!answer) return null;
  const value =
    answer.text ?? answer.email ?? answer.url ?? answer.choice?.label ?? answer.choice?.other;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Reads the contact questions; unanswered or missing ones become null. */
export function extractContactDetails(payload: TypeformWebhookPayload): ContactDetails {
  const answers = payload.form_response?.answers ?? [];
  const answerFor = (ref: string) => answers.find((a) => a.field?.ref === ref);
  const consent = answerFor(CONTACT_FIELD_REFS.marketingConsent);
  const firstName = answerText(answerFor(CONTACT_FIELD_REFS.firstName));
  const lastName = answerText(answerFor(CONTACT_FIELD_REFS.lastName));
  const singleName =
    answerText(answerFor(CONTACT_FIELD_REFS.name)) ?? answerText(answerFor("Full_name"));
  const joined = [firstName, lastName].filter(Boolean).join(" ");

  return {
    fullName: singleName ?? (joined || null),
    firstName,
    lastName,
    company: answerText(answerFor(CONTACT_FIELD_REFS.company)),
    role: answerText(answerFor(CONTACT_FIELD_REFS.role)),
    email: answerText(answerFor(CONTACT_FIELD_REFS.email)),
    linkedin: answerText(answerFor(CONTACT_FIELD_REFS.linkedin)),
    marketingConsent: typeof consent?.boolean === "boolean" ? consent.boolean : null,
    marketingConsentRaw:
      typeof consent?.boolean === "boolean"
        ? String(consent.boolean)
        : consent
          ? answerValues(consent).join(", ") || null
          : null,
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
