import nodemailer from "nodemailer";

/*
 * Sends email through a Gmail account with an app password (free, no domain
 * needed, ~500 recipients/day). Env:
 *   GMAIL_USER          the Gmail address that sends, e.g. bourzma.beyond@gmail.com
 *   GMAIL_APP_PASSWORD  16-character app password (Google Account → Security)
 *   EMAIL_FROM_NAME     optional display name, default "BOURZMA"
 * Gmail always sends from GMAIL_USER itself, so only the name is configurable.
 */

export class MailerConfigError extends Error {
  constructor() {
    super("GMAIL_USER or GMAIL_APP_PASSWORD is not set");
    this.name = "MailerConfigError";
  }
}

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments: { filename: string; content: Buffer; contentType: string; cid?: string }[];
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
}

/** Sends one email; returns the SMTP message ID (no personal data). */
export async function sendMail(mail: OutgoingMail): Promise<{ messageId: string }> {
  const user = process.env.GMAIL_USER?.trim();
  // App passwords are shown with spaces ("abcd efgh ..."); Gmail wants them without.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) throw new MailerConfigError();

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  const name = process.env.EMAIL_FROM_NAME?.trim() || "BOURZMA";

  const info = await transport.sendMail({
    from: { name, address: user },
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: mail.attachments,
  });
  return { messageId: info.messageId };
}
