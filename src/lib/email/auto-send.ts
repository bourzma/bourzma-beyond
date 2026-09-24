import { emailAlreadySent, markEmailSent } from "@/lib/card/store";
import { sendBeyondCardEmail } from "./send-card-email";

/*
 * Automatic Beyond Card email for a Typeform submission.
 *
 * OFF unless EMAIL_AUTO_SEND is exactly "true" in the environment, so it can
 * be switched on and off in Vercel without code changes (redeploy to apply).
 * Sends at most once per Beyond ID: a marker file is written after sending,
 * and a Typeform retry that finds it does not send again.
 */

export type AutoEmailStatus =
  | "disabled"
  | "sent"
  | "already-sent"
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
  if (!input.cardStored) return { status: "skipped-card-not-stored" };
  const to = input.to?.trim() ?? "";
  if (!EMAIL_PATTERN.test(to) || to.length > 254) return { status: "skipped-no-email" };

  if (await emailAlreadySent(input.beyondId)) return { status: "already-sent" };

  const { messageId } = await sendBeyondCardEmail({ beyondId: input.beyondId, to });
  await markEmailSent(input.beyondId, messageId);
  return { status: "sent", messageId };
}
