import type { BeyondProject } from "@/lib/beyond/projects";
import { getBeyondType, type BeyondTypeId } from "@/lib/beyond/types";

/*
 * The temporary Beyond Card email. Fixed structure, content only from the
 * existing type and project data (no AI text, no video yet):
 *
 *   BOURZMA / BEYOND THE ORDINARY
 *   YOU'RE THE [TYPE] / [TYPE DESCRIPTION]
 *   [Beyond Card PNG]
 *   THIS ONE FEELS LIKE YOU. / [PROJECT NAME] / [SHORT LINE] / [WHAT WE DID]
 */

/** Content-ID of the inline card image (the PNG is also a normal attachment). */
export const CARD_CONTENT_ID = "beyond-card";

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
  const p = input.project;
  const e = escapeHtml;

  const font = "font-family:Arial,Helvetica,sans-serif;";
  const label = `${font}font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ffffff;margin:0;`;
  const headline = `${font}font-size:30px;line-height:34px;font-weight:900;text-transform:uppercase;color:#ffffff;margin:0;`;
  const body = `${font}font-size:16px;line-height:24px;color:#ffffff;margin:0;`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(`Your Beyond Card — ${type.name}`)}</title></head>
<body style="margin:0;padding:0;background:#000000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td style="padding:0 0 4px;"><p style="${font}font-size:20px;font-weight:900;letter-spacing:2px;color:#ffffff;margin:0;">BOURZMA</p></td></tr>
  <tr><td style="padding:0 0 40px;"><p style="${label}">Beyond the Ordinary</p></td></tr>
  <tr><td style="padding:0 0 12px;"><p style="${headline}">You&rsquo;re the ${e(typeWord)}</p></td></tr>
  <tr><td style="padding:0 0 32px;"><p style="${body}">${e(type.tagline)}</p></td></tr>
  <tr><td style="padding:0 0 40px;"><img src="cid:${CARD_CONTENT_ID}" width="600" alt="Your Beyond Card: ${e(type.name)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
  <tr><td style="padding:0 0 16px;"><p style="${label}">This one feels like you.</p></td></tr>
  <tr><td style="padding:0 0 8px;"><p style="${headline}">${e(p.name)}</p></td></tr>
  <tr><td style="padding:0 0 16px;"><p style="${body}font-weight:700;">${e(p.shortLine)}</p></td></tr>
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
    `YOU'RE THE ${typeWord}`,
    "",
    type.tagline,
    "",
    "Your Beyond Card is attached.",
    "",
    "THIS ONE FEELS LIKE YOU.",
    "",
    p.name,
    "",
    p.shortLine,
    "",
    p.whatWeDid,
  ].join("\n");

  return { subject: `Your Beyond Card — ${type.name}`, html, text };
}
