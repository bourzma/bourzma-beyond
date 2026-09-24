import { BlobNotFoundError, get, head, put } from "@vercel/blob";

/*
 * Cards contain names and company names, so they are stored as PRIVATE
 * Vercel Blobs, one file per submission: cards/<Beyond ID>.png. They are only
 * served through the key-protected /api/cards/[beyondId] route.
 * Needs BLOB_READ_WRITE_TOKEN (set automatically when a Blob store is
 * connected to the Vercel project).
 */

export const cardPathname = (beyondId: string) => `cards/${beyondId}.png`;

export function isCardStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** True if a card for this Beyond ID was already stored. */
export async function cardExists(beyondId: string): Promise<boolean> {
  try {
    await head(cardPathname(beyondId));
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    throw error;
  }
}

export async function saveCard(beyondId: string, png: Buffer): Promise<void> {
  await put(cardPathname(beyondId), png, {
    access: "private",
    contentType: "image/png",
    addRandomSuffix: false,
    // Same ID = same submission = same card, so a concurrent retry may overwrite.
    allowOverwrite: true,
  });
}

/** The stored PNG as a stream, or null if there is no card with this ID. */
export async function readCard(beyondId: string): Promise<ReadableStream<Uint8Array> | null> {
  const result = await get(cardPathname(beyondId), { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return result.stream;
}
