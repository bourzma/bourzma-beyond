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

/**
 * Typeform webhook: receives the full submission, scores it and returns
 * everything parsed, so it can be checked in Typeform's delivery log.
 * No email is sent yet.
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
  const contact = extractContactDetails(payload);
  const professionalContext = extractProfessionalContext(payload);

  try {
    const result = scoreAnswers(extractAnswers(payload));
    const match = matchProjects(result.beyondType, professionalContext);

    // Logs which fields arrived, never their values: no personal data in logs.
    console.log(
      "[typeform] submission parsed",
      JSON.stringify({
        responseToken,
        received: {
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
      }),
    );

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
