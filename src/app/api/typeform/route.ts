import { createBeyondCard, type CardResult } from "@/lib/card/service";
import { autoSendCardEmail, type AutoEmailStatus } from "@/lib/email/auto-send";
import { redact } from "@/lib/card/store";
import { InvalidAnswersError, scoreAnswers } from "@/lib/beyond/scoring";
import { matchProjects } from "@/lib/beyond/matching";
import {
  CONTACT_FIELD_REFS,
  extractAnswers,
  extractContactDetails,
  extractProfessionalContext,
  verifyTypeformSignature,
  type TypeformWebhookPayload,
} from "@/lib/beyond/typeform";

/** An error as "Name: message" with credentials and email addresses removed. */
function safeErrorReason(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return redact(text)
    .replace(/[^\s<>()"',;:]+@[^\s<>()"',;:]+/g, "[address]")
    .slice(0, 500);
}

/**
 * Typeform webhook: verifies the signature, scores the submission, matches
 * projects, generates and stores the Beyond Card, and returns everything
 * parsed so it can be checked in Typeform's delivery log.
 * Emails the card only when EMAIL_AUTO_SEND=true (see lib/email/auto-send).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const secret = process.env.TYPEFORM_WEBHOOK_SECRET;
  if (!secret && process.env.VERCEL_ENV === "production") {
    // Fail closed: never accept unsigned submissions in production.
    console.error("[typeform] TYPEFORM_WEBHOOK_SECRET is not set; rejecting webhook");
    return Response.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  if (
    secret &&
    !verifyTypeformSignature(rawBody, request.headers.get("typeform-signature"), secret)
  ) {
    console.warn("[typeform] rejected webhook with missing or invalid signature");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: TypeformWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const responseToken = payload.form_response?.token ?? null;
  if (!responseToken) {
    // The Beyond ID (and so idempotency) depends on Typeform's response token.
    return Response.json({ error: "Missing form_response.token" }, { status: 422 });
  }
  const contact = extractContactDetails(payload);
  const professionalContext = extractProfessionalContext(payload);

  try {
    const result = scoreAnswers(extractAnswers(payload));
    const match = matchProjects(result.beyondType, professionalContext);

    // Beyond Card: generated from the approved template and stored privately.
    // Idempotent: a Typeform retry reuses the card already stored for this token.
    let card: CardResult;
    try {
      card = await createBeyondCard({
        responseToken,
        contact,
        beyondType: result.beyondType,
        primaryProjectId: match.primary.id,
        secondaryProjectId: match.secondary?.id ?? null,
      });
    } catch (error) {
      console.error(
        "[typeform] card generation failed",
        JSON.stringify({ responseToken, error: error instanceof Error ? error.message : String(error) }),
      );
      // 500 makes Typeform retry later; the retry gets the same Beyond ID.
      return Response.json({ error: "Card generation failed", responseToken }, { status: 500 });
    }

    // Beyond Card email: only when EMAIL_AUTO_SEND=true, at most once per card.
    let email: { status: AutoEmailStatus; messageId?: string };
    try {
      email = await autoSendCardEmail({ beyondId: card.beyondId, to: contact.email, cardStored: card.stored });
    } catch (error) {
      // Safe to show: tokens redacted and email addresses removed.
      const reason = safeErrorReason(error);
      console.error(
        "[typeform] card email failed",
        JSON.stringify({ responseToken, beyondId: card.beyondId, error: reason }),
      );
      // 500 makes Typeform retry: the card is reused and the email tried again
      // (it was not marked as sent).
      return Response.json(
        { error: "Card email failed", reason, responseToken, card },
        { status: 500 },
      );
    }

    // Logs which fields arrived, never their values: no personal data in logs.
    console.log(
      "[typeform] submission parsed",
      JSON.stringify({
        responseToken,
        received: {
          // "Name" = a full name was found (single question or first + last).
          [CONTACT_FIELD_REFS.name]: contact.fullName !== null,
          [CONTACT_FIELD_REFS.firstName]: contact.firstName !== null,
          [CONTACT_FIELD_REFS.lastName]: contact.lastName !== null,
          [CONTACT_FIELD_REFS.company]: contact.company !== null,
          [CONTACT_FIELD_REFS.role]: contact.role !== null,
          [CONTACT_FIELD_REFS.email]: contact.email !== null,
          [CONTACT_FIELD_REFS.linkedin]: contact.linkedin !== null,
          [CONTACT_FIELD_REFS.marketingConsent]: contact.marketingConsentRaw !== null,
        },
        answers: result.answers,
        professionalContext,
        beyondType: result.beyondType,
        primaryProject: match.primary.id,
        secondaryProject: match.secondary?.id ?? null,
        card,
        email,
      }),
    );
    if (!card.stored) {
      console.warn("[typeform] card generated but NOT stored: no Blob store connected (BLOB_STORE_ID)");
    }

    return Response.json({
      responseToken,
      submittedAt: payload.form_response?.submitted_at ?? null,
      contact,
      answers: result.answers,
      professionalContext,
      scores: result.scores,
      beyondType: result.beyondType,
      strongSides: result.strongSides,
      // Full project records, ready for the Beyond Card email later.
      primaryProject: match.primary,
      secondaryProject: match.secondary,
      card,
      email,
    });
  } catch (error) {
    if (error instanceof InvalidAnswersError) {
      console.warn(
        "[typeform] submission rejected",
        JSON.stringify({ responseToken, problems: error.problems }),
      );
      return Response.json({ error: error.message, problems: error.problems }, { status: 422 });
    }
    throw error;
  }
}
