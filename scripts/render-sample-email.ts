/*
 * Writes a preview of the Beyond Card email to ./card-samples/email.html,
 * using a sample card from `npm run cards:samples`. Nothing is sent.
 *   npx tsx scripts/render-sample-email.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PROJECTS } from "@/lib/beyond/projects";
import { CARD_CONTENT_ID, buildBeyondCardEmail } from "@/lib/email/beyond-card-email";

const dir = path.join(process.cwd(), "card-samples");
const email = buildBeyondCardEmail({
  beyondType: "visionary",
  project: PROJECTS.find((p) => p.id === "delivery-van-redesign")!,
});
const html = email.html.replace(`cid:${CARD_CONTENT_ID}`, "canva-match.png");
fs.writeFileSync(path.join(dir, "email.html"), html);
console.log(`Subject: ${email.subject}\nWritten to ${path.join(dir, "email.html")}`);
