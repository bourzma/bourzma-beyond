import { claimEmailSend, emailAlreadySent, markEmailSent, releaseEmailClaim } from "@/lib/card/store";
import { sendBeyondCardEmail } from "./send-card-email";

/*
 * Automatic Beyond Card email for a Typeform submission (transactional: the
 * respondent asked for their card, so Marketing_consent does not apply).
 *
 * ON only when EMAIL_AUTO_SEND is exactly "true" (set in Vercel, redeploy to
 * apply; anything else switches it off).
 *
 * At most one email per Beyond ID:
 *   1. cards/<id>.email-sent.json exists      → "already-sent", nothing sent
 *   2. claim cards/<id>.email-claim.json      → only one delivery can create it;
 *      another delivery holding it           → "in-progress", nothing sent
 *   3. send, write email-sent.json, release the claim
 *   If sending fails the claim is released and nothing is marked, so the
 *   Typeform retry sends it.
 */

export type AutoEmailStatus =
  | "disabled"
  | "sent"
  | "already-sent"
  | "in-progress"
  | "skipped-no-email"
  | "skipped-card-not-stored";

const EMAIL_PATTERN = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

export function isAutoEmailEnabled(): boolean {
  return process.env.EMAIL_AUTO_SEND?.trim() === "true";
}

export async function autoSendCardEmail(input: {
  beyondId: string;
  to: string | null;
  cardStored: boolean;
}): Promise<{ status: AutoEmailStatus; messageId?: string }> {
  if (!isAutoEmailEnabled()) return { status: "disabled" };
  // Only a successfully stored card is ever emailed (the email uses that exact PNG).
  if (!input.cardStored) return { status: "skipped-card-not-stored" };
  const to = input.to?.trim() ?? "";
  if (!EMAIL_PATTERN.test(to) || to.length > 254) return { status: "skipped-no-email" };

  if (await emailAlreadySent(input.beyondId)) return { status: "already-sent" };
  if ((await claimEmailSend(input.beyondId)) === "busy") return { status: "in-progress" };

  let messageId: string;
  try {
    ({ messageId } = await sendBeyondCardEmail({ beyondId: input.beyondId, to }));
  } catch (error) {
    await releaseEmailClaim(input.beyondId);
    throw error;
  }
  try {
    await markEmailSent(input.beyondId, messageId);
  } catch {
    // The email WAS sent. Report success (a 500 would make Typeform retry and
    // send again) and keep the claim, which blocks re-sending. Already logged.
    return { status: "sent", messageId };
  }
  await releaseEmailClaim(input.beyondId);
  return { status: "sent", messageId };
}
