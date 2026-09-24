import { PROJECTS } from "@/lib/beyond/projects";
import { readCardMeta, readCardPng } from "@/lib/card/store";
import { CARD_CONTENT_ID, buildBeyondCardEmail } from "./beyond-card-email";
import { MailerConfigError, sendMail } from "./mailer";

/*
 * Sends the Beyond Card email for a card that is already stored, using the
 * exact stored PNG (never regenerated) and the stored type and project.
 * Used by the automatic sender and by the protected test endpoint.
 */

export class CardEmailError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CardEmailError";
  }
}

export async function sendBeyondCardEmail(input: { beyondId: string; to: string }): Promise<{
  messageId: string;
  beyondType: string;
  primaryProjectId: string;
}> {
  const meta = await readCardMeta(input.beyondId);
  if (!meta) {
    throw new CardEmailError(
      404,
      "No card data for this Beyond ID. Cards stored before the email step need one Typeform retry " +
        "(resend the delivery), or submit a new test response.",
    );
  }
  const png = await readCardPng(input.beyondId);
  if (!png) throw new CardEmailError(404, "No stored card PNG for this Beyond ID");

  const project = PROJECTS.find((p) => p.id === meta.primaryProjectId);
  if (!project) throw new CardEmailError(500, `Unknown project "${meta.primaryProjectId}"`);

  const email = buildBeyondCardEmail({ beyondType: meta.beyondType, project });
  try {
    const { messageId } = await sendMail({
      to: input.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [
        {
          filename: `beyond-card-${input.beyondId}.png`,
          content: png,
          contentType: "image/png",
          cid: CARD_CONTENT_ID,
        },
      ],
    });
    return { messageId, beyondType: meta.beyondType, primaryProjectId: meta.primaryProjectId };
  } catch (error) {
    if (error instanceof MailerConfigError) throw new CardEmailError(500, error.message);
    const smtp = error as { code?: string; responseCode?: number; response?: string };
    const code = smtp.responseCode ?? smtp.code ?? "unknown error";
    // Gmail's reply says why (e.g. "5.7.9 Application-specific password
    // required"); addresses are removed because SMTP replies can echo them.
    const reason = (smtp.response ?? "")
      .replace(/[^\s<>()"',;:]+@[^\s<>()"',;:]+/g, "[address]")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
    throw new CardEmailError(502, `Gmail did not accept the email (${code})${reason ? `: ${reason}` : ""}`);
  }
}
