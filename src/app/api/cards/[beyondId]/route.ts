import { isBeyondId } from "@/lib/card/beyond-id";
import { NO_STORE_HEADERS, checkPreviewKey } from "@/lib/card/preview-key";
import { readCard } from "@/lib/card/store";

/*
 * Testing preview of a stored Beyond Card:
 *   GET /api/cards/BYD-XXXX-XXXX?key=<CARD_PREVIEW_KEY>            view in browser
 *   GET /api/cards/BYD-XXXX-XXXX?key=<CARD_PREVIEW_KEY>&download=1 download PNG
 * Disabled (404) unless CARD_PREVIEW_KEY is set. Cards contain personal data,
 * so responses are never cached or indexed.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/cards/[beyondId]">) {
  const access = checkPreviewKey(request);
  if (access === "disabled") return new Response("Not found", { status: 404, headers: NO_STORE_HEADERS });
  if (access === "unauthorized") return new Response("Unauthorized", { status: 401, headers: NO_STORE_HEADERS });

  const { beyondId } = await ctx.params;
  if (!isBeyondId(beyondId)) {
    return new Response("Invalid Beyond ID", { status: 400, headers: NO_STORE_HEADERS });
  }

  const stream = await readCard(beyondId);
  if (!stream) return new Response("No card for this Beyond ID", { status: 404, headers: NO_STORE_HEADERS });

  const disposition = new URL(request.url).searchParams.get("download") ? "attachment" : "inline";
  return new Response(stream, {
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "image/png",
      "Content-Disposition": `${disposition}; filename="beyond-card-${beyondId}.png"`,
    },
  });
}
