import { NO_STORE_HEADERS, checkPreviewKey } from "@/lib/card/preview-key";
import { checkStorage } from "@/lib/card/store";

/*
 * Verifies the private Blob store from inside production:
 *   GET /api/cards/storage-check?key=<CARD_PREVIEW_KEY>
 * Writes, reads and deletes a tiny private test file and reports each step.
 * Disabled (404) unless CARD_PREVIEW_KEY is set. Returns no secrets.
 */
export async function GET(request: Request) {
  const access = checkPreviewKey(request);
  if (access === "disabled") return new Response("Not found", { status: 404, headers: NO_STORE_HEADERS });
  if (access === "unauthorized") return new Response("Unauthorized", { status: 401, headers: NO_STORE_HEADERS });

  const result = await checkStorage();
  return Response.json(
    { ...result, storeIdConfigured: Boolean(process.env.BLOB_STORE_ID?.trim()) },
    { status: result.ok ? 200 : 500, headers: NO_STORE_HEADERS },
  );
}
