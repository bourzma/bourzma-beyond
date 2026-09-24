import { Resend } from "resend";
import { PROJECTS } from "@/lib/beyond/projects";
import { readCardMeta, readCardPng } from "@/lib/card/store";
import { CARD_CONTENT_ID, buildBeyondCardEmail } from "./beyond-card-email";

/*
 * Sends ONE Beyond Card email for a card that is already stored, to an
 * address given by the tester. Uses the exact stored PNG; never regenerates.
 * Only called by the protected /api/email/test endpoint: the Typeform
 * webhook does not send email.
 */

export class TestEmailError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "TestEmailError";
  }
}

export async function sendTestBeyondCardEmail(input: { beyondId: string; to: string }): Promise<{
  emailId: string;
  beyondType: string;
  primaryProjectId: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new TestEmailError(500, "RESEND_API_KEY or EMAIL_FROM is not set");

  const meta = await readCardMeta(input.beyondId);
  if (!meta) {
    throw new TestEmailError(
      404,
      "No card data for this Beyond ID. Cards stored before the email step need one Typeform retry " +
        "(resend the delivery), or submit a new test response.",
    );
  }
  const png = await readCardPng(input.beyondId);
  if (!png) throw new TestEmailError(404, "No stored card PNG for this Beyond ID");

  const project = PROJECTS.find((p) => p.id === meta.primaryProjectId);
  if (!project) throw new TestEmailError(500, `Unknown project "${meta.primaryProjectId}"`);

  const email = buildBeyondCardEmail({ beyondType: meta.beyondType, project });
  const { data, error } = await new Resend(apiKey).emails.send({
    from,
    to: input.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [
      {
        filename: `beyond-card-${input.beyondId}.png`,
        content: png,
        contentType: "image/png",
        contentId: CARD_CONTENT_ID,
      },
    ],
    tags: [{ name: "kind", value: "beyond-card-test" }],
  });

  if (error || !data) {
    throw new TestEmailError(502, `Resend rejected the email: ${error?.name ?? "unknown"}: ${error?.message ?? ""}`);
  }
  return { emailId: data.id, beyondType: meta.beyondType, primaryProjectId: meta.primaryProjectId };
}
