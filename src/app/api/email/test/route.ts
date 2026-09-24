import { timingSafeEqual } from "node:crypto";
import { isBeyondId } from "@/lib/card/beyond-id";
import { NO_STORE_HEADERS } from "@/lib/card/preview-key";
import { CardEmailError, sendBeyondCardEmail } from "@/lib/email/send-card-email";

/*
 * TEST ONLY: sends one Beyond Card email for an already stored card.
 *
 *   POST /api/email/test
 *   Header: x-email-test-key: <EMAIL_TEST_KEY>
 *   Body:   { "beyondId": "BYD-XXXX-XXXX", "to": "you@example.com" }
 *
 * Disabled (404) unless EMAIL_TEST_KEY is set. Does not mark the card as
 * emailed, so it never affects the automatic send.
 */

const EMAIL_PATTERN = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

function keyMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: NO_STORE_HEADERS });

export async function POST(request: Request) {
  const expected = process.env.EMAIL_TEST_KEY;
  if (!expected) return json({ error: "Not found" }, 404);
  if (!keyMatches(request.headers.get("x-email-test-key"), expected)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { beyondId?: unknown; to?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be JSON: { beyondId, to }" }, 400);
  }
  const beyondId = typeof body.beyondId === "string" ? body.beyondId.trim().toUpperCase() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!isBeyondId(beyondId)) return json({ error: "beyondId must look like BYD-XXXX-XXXX" }, 400);
  if (!EMAIL_PATTERN.test(to) || to.length > 254) return json({ error: "to must be one email address" }, 400);

  try {
    const sent = await sendBeyondCardEmail({ beyondId, to });
    // Never log the recipient address.
    console.log("[email-test] sent", JSON.stringify({ beyondId, ...sent }));
    return json({ ok: true, beyondId, ...sent }, 200);
  } catch (error) {
    const status = error instanceof CardEmailError ? error.status : 500;
    const message = error instanceof CardEmailError ? error.message : "Unknown error";
    console.error("[email-test] failed", JSON.stringify({ beyondId, status, error: message }));
    return json({ ok: false, error: message }, status);
  }
}
