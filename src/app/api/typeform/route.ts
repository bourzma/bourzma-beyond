import { InvalidAnswersError, scoreAnswers } from "@/lib/beyond/scoring";
import { matchProjects } from "@/lib/beyond/matching";
import {
  extractAnswers,
  extractProfessionalContext,
  verifyTypeformSignature,
  type TypeformWebhookPayload,
} from "@/lib/beyond/typeform";

/** Typeform webhook: scores a submitted response and returns the result. */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const secret = process.env.TYPEFORM_WEBHOOK_SECRET;
  if (
    secret &&
    !verifyTypeformSignature(rawBody, request.headers.get("typeform-signature"), secret)
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: TypeformWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  try {
    const result = scoreAnswers(extractAnswers(payload));
    const context = extractProfessionalContext(payload);
    const match = matchProjects(result.beyondType, context);
    return Response.json({
      responseToken: payload.form_response?.token ?? null,
      ...result,
      professionalContext: context,
      // Full project records, so an email step can use name, shortLine, whatWeDid, etc.
      primaryProject: match.primary,
      secondaryProject: match.secondary,
    });
  } catch (error) {
    if (error instanceof InvalidAnswersError) {
      return Response.json({ error: error.message, problems: error.problems }, { status: 422 });
    }
    throw error;
  }
}
