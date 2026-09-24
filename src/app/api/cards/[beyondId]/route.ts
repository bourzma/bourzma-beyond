import { timingSafeEqual } from "node:crypto";
import { isBeyondId } from "@/lib/card/beyond-id";
import { readCard } from "@/lib/card/store";

/*
 * Testing preview of a stored Beyond Card:
 *   GET /api/cards/BYD-XXXX-XXXX?key=<CARD_PREVIEW_KEY>            view in browser
 *   GET /api/cards/BYD-XXXX-XXXX?key=<CARD_PREVIEW_KEY>&download=1 download PNG
 * Disabled (404) unless CARD_PREVIEW_KEY is set. Cards contain personal data,
 * so responses are never cached or indexed.
 */

const NO_STORE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

function keyMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request, ctx: RouteContext<"/api/cards/[beyondId]">) {
  const expected = process.env.CARD_PREVIEW_KEY;
  if (!expected) return new Response("Not found", { status: 404, headers: NO_STORE });

  const url = new URL(request.url);
  if (!keyMatches(url.searchParams.get("key"), expected)) {
    return new Response("Unauthorized", { status: 401, headers: NO_STORE });
  }

  const { beyondId } = await ctx.params;
  if (!isBeyondId(beyondId)) {
    return new Response("Invalid Beyond ID", { status: 400, headers: NO_STORE });
  }

  const stream = await readCard(beyondId);
  if (!stream) return new Response("No card for this Beyond ID", { status: 404, headers: NO_STORE });

  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(stream, {
    headers: {
      ...NO_STORE,
      "Content-Type": "image/png",
      "Content-Disposition": `${disposition}; filename="beyond-card-${beyondId}.png"`,
    },
  });
}
