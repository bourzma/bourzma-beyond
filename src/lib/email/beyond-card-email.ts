import type { BeyondProject } from "@/lib/beyond/projects";
import { getBeyondType, type BeyondTypeId } from "@/lib/beyond/types";

/*
 * The Beyond Card email. Fixed copy; content only from the existing type and
 * project data (no AI text):
 *
 *   [Bourzma logo] / BEYOND THE ORDINARY
 *   Thank you for taking the test
 *   We're always looking for new ideas and journeys…
 *   YOU'RE THE [TYPE] / [type description]
 *   [Beyond Card PNG]
 *   THIS ONE FEELS LIKE YOU. / [PROJECT NAME] / [email lead] / [what we did]
 *
 * Type follows the Beyond Card (Archivo Expanded, stand-in for Sequel 100)
 * where the email app loads web fonts; Arial elsewhere.
 */

/** Content-IDs of the inline images (sent as attachments by the sender). */
export const CARD_CONTENT_ID = "beyond-card";
export const LOGO_CONTENT_ID = "bourzma-logo";

export const THANK_YOU = "Thank you for taking the Beyond the Ordinary test.";
export const ALWAYS_LOOKING =
  "At Bourzma we are always looking for new ideas, new people and new journeys to take together. Here is what your answers say about you.";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export interface BeyondCardEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildBeyondCardEmail(input: {
  beyondType: BeyondTypeId;
  project: BeyondProject;
}): BeyondCardEmail {
  const type = getBeyondType(input.beyondType);
  const typeWord = type.label.toUpperCase();
  const description = type.tagline.replace(/\.\s*$/, "");
  const p = input.project;
  const e = escapeHtml;

  const font = "font-family:'Archivo',Arial,Helvetica,sans-serif;font-stretch:125%;";
  const label = `${font}font-size:11px;line-height:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#ffffff;margin:0;`;
  const headline = `${font}font-size:30px;line-height:34px;font-weight:900;text-transform:uppercase;color:#ffffff;margin:0;`;
  const lead = `${font}font-size:20px;line-height:28px;font-weight:700;color:#ffffff;margin:0;`;
  const body = `${font}font-size:16px;line-height:25px;font-weight:400;color:#ffffff;margin:0;`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,400;125,700;125,900&display=swap" rel="stylesheet">
<title>${e(`Your Beyond Card — ${type.name}`)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td style="padding:0 0 12px;"><img src="cid:${LOGO_CONTENT_ID}" width="240" alt="BOURZMA" style="display:block;width:240px;max-width:100%;height:auto;border:0;"></td></tr>
  <tr><td style="padding:0 0 44px;"><p style="${label}">Beyond the Ordinary</p></td></tr>
  <tr><td style="padding:0 0 16px;"><p style="${lead}">${e(THANK_YOU)}</p></td></tr>
  <tr><td style="padding:0 0 44px;"><p style="${body}">${e(ALWAYS_LOOKING)}</p></td></tr>
  <tr><td style="padding:0 0 10px;"><p style="${label}">You&rsquo;re the</p></td></tr>
  <tr><td style="padding:0 0 12px;"><p style="${headline}">${e(typeWord)}</p></td></tr>
  <tr><td style="padding:0 0 28px;"><p style="${lead}">${e(description)}</p></td></tr>
  <tr><td style="padding:0 0 44px;"><img src="cid:${CARD_CONTENT_ID}" width="600" alt="Your Beyond Card: ${e(type.name)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
  <tr><td style="padding:0 0 10px;"><p style="${label}">This one feels like you.</p></td></tr>
  <tr><td style="padding:0 0 12px;"><p style="${headline}">${e(p.name)}</p></td></tr>
  <tr><td style="padding:0 0 16px;"><p style="${lead}">${e(p.emailLead)}</p></td></tr>
  <tr><td style="padding:0;"><p style="${body}">${e(p.whatWeDid)}</p></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "BOURZMA",
    "BEYOND THE ORDINARY",
    "",
    THANK_YOU,
    "",
    ALWAYS_LOOKING,
    "",
    `YOU'RE THE ${typeWord}`,
    description,
    "",
    "Your Beyond Card is attached.",
    "",
    "THIS ONE FEELS LIKE YOU.",
    "",
    p.name,
    p.emailLead,
    "",
    p.whatWeDid,
  ].join("\n");

  return { subject: `Your Beyond Card — ${type.name}`, html, text };
}
