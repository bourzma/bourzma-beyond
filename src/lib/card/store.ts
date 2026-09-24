import { BlobNotFoundError, del, get, head, put } from "@vercel/blob";
import { isBeyondTypeId, type BeyondTypeId } from "@/lib/beyond/types";

/*
 * Cards contain names and company names, so they are stored as PRIVATE
 * Vercel Blobs, one file per submission: cards/<Beyond ID>.png. They are only
 * served through the key-protected /api/cards/[beyondId] route.
 *
 * Authentication: the connected private Blob store provides BLOB_STORE_ID,
 * and @vercel/blob signs requests with the function's Vercel OIDC token
 * automatically (no BLOB_READ_WRITE_TOKEN needed). A classic
 * BLOB_READ_WRITE_TOKEN still works if one is ever set.
 */

export const cardPathname = (beyondId: string) => `cards/${beyondId}.png`;
export const cardMetaPathname = (beyondId: string) => `cards/${beyondId}.json`;
/** Written after the automatic email is sent; its presence prevents a second send. */
export const emailMarkerPathname = (beyondId: string) => `cards/${beyondId}.email-sent.json`;
/** Held while one delivery is sending, so an overlapping retry does not send too. */
export const emailClaimPathname = (beyondId: string) => `cards/${beyondId}.email-claim.json`;

/** A claim older than this is from an attempt that crashed and may be taken over. */
export const EMAIL_CLAIM_STALE_MS = 10 * 60 * 1000;

/**
 * What the stored card was made from, for the email step. Deliberately no
 * personal data: names and company are only on the PNG itself.
 */
export interface CardMeta {
  version: 1;
  beyondId: string;
  beyondType: BeyondTypeId;
  primaryProjectId: string;
  secondaryProjectId: string | null;
  createdAt: string;
}

export type BlobAuthMode = "oidc" | "read-write-token" | "none";

/** How @vercel/blob will authenticate, from configuration only (no secrets). */
export function blobAuthMode(): BlobAuthMode {
  if (process.env.BLOB_STORE_ID?.trim()) return "oidc";
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "read-write-token";
  return "none";
}

export function isCardStorageConfigured(): boolean {
  return blobAuthMode() !== "none";
}

/** Removes anything that could be a credential from an error message. */
export function redact(message: string): string {
  return message
    .replace(/vercel_blob_rw_[A-Za-z0-9_-]+/g, "[redacted-token]")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?/g, "[redacted-jwt]")
    .replace(/(authorization|token|secret)(["'\s:=]+)[^\s"',}]+/gi, "$1$2[redacted]");
}

export class CardStorageError extends Error {
  constructor(
    public readonly stage:
      | "exists"
      | "save"
      | "read"
      | "meta-exists"
      | "meta-save"
      | "meta-read"
      | "email-marker-exists"
      | "email-marker-save"
      | "email-claim",
    public readonly beyondId: string,
    cause: unknown,
  ) {
    const name = cause instanceof Error ? cause.name : "Error";
    const message = redact(cause instanceof Error ? cause.message : String(cause));
    super(`Blob ${stage} failed (${name}): ${message}`);
    this.name = "CardStorageError";
  }
}

/** Logs a storage failure with no tokens and no personal data, then throws. */
function fail(stage: CardStorageError["stage"], beyondId: string, cause: unknown): never {
  const error = new CardStorageError(stage, beyondId, cause);
  console.error(
    "[blob] storage failure",
    JSON.stringify({
      stage,
      beyondId,
      auth: blobAuthMode(),
      error: error.message,
      status: (cause as { status?: number })?.status ?? null,
    }),
  );
  throw error;
}

/** True if a card for this Beyond ID was already stored. */
export async function cardExists(beyondId: string): Promise<boolean> {
  try {
    await head(cardPathname(beyondId));
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    fail("exists", beyondId, error);
  }
}

export async function saveCard(beyondId: string, png: Buffer): Promise<void> {
  try {
    await put(cardPathname(beyondId), png, {
      access: "private",
      contentType: "image/png",
      addRandomSuffix: false,
      // Same ID = same submission = same card, so a concurrent retry may overwrite.
      allowOverwrite: true,
    });
  } catch (error) {
    fail("save", beyondId, error);
  }
}

/** The stored PNG as a stream, or null if there is no card with this ID. */
export async function readCard(beyondId: string): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const result = await get(cardPathname(beyondId), { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return result.stream;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    fail("read", beyondId, error);
  }
}

/** The stored PNG as bytes (for email attachments), or null if missing. */
export async function readCardPng(beyondId: string): Promise<Buffer | null> {
  const stream = await readCard(beyondId);
  return stream ? Buffer.from(await new Response(stream).arrayBuffer()) : null;
}

export async function cardMetaExists(beyondId: string): Promise<boolean> {
  try {
    await head(cardMetaPathname(beyondId));
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    fail("meta-exists", beyondId, error);
  }
}

export async function saveCardMeta(meta: CardMeta): Promise<void> {
  try {
    await put(cardMetaPathname(meta.beyondId), JSON.stringify(meta), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (error) {
    fail("meta-save", meta.beyondId, error);
  }
}

/** The stored card metadata, or null if missing or unreadable. */
export async function readCardMeta(beyondId: string): Promise<CardMeta | null> {
  let text: string;
  try {
    const result = await get(cardMetaPathname(beyondId), { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    text = await new Response(result.stream).text();
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    fail("meta-read", beyondId, error);
  }
  try {
    const meta = JSON.parse(text) as CardMeta;
    return meta.beyondId === beyondId && isBeyondTypeId(meta.beyondType) ? meta : null;
  } catch {
    return null;
  }
}

export async function emailAlreadySent(beyondId: string): Promise<boolean> {
  try {
    await head(emailMarkerPathname(beyondId));
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    fail("email-marker-exists", beyondId, error);
  }
}

/** Records the send. No recipient address: only ID, time and message ID. */
export async function markEmailSent(beyondId: string, messageId: string): Promise<void> {
  try {
    await put(
      emailMarkerPathname(beyondId),
      JSON.stringify({ beyondId, sentAt: new Date().toISOString(), messageId }),
      { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true },
    );
  } catch (error) {
    fail("email-marker-save", beyondId, error);
  }
}

/**
 * Atomically claims the right to send this card's email. Creating the claim
 * file fails if it already exists, so only one delivery can hold it.
 * Returns "claimed", or "busy" if another delivery holds a fresh claim.
 * A stale claim (crashed attempt) is taken over.
 */
export async function claimEmailSend(beyondId: string, now = Date.now()): Promise<"claimed" | "busy"> {
  const pathname = emailClaimPathname(beyondId);
  const body = JSON.stringify({ beyondId, claimedAt: new Date(now).toISOString() });
  const options = { access: "private" as const, contentType: "application/json", addRandomSuffix: false };
  try {
    await put(pathname, body, { ...options, allowOverwrite: false });
    return "claimed";
  } catch (createError) {
    // Creating failed: find out whether that is because a claim already exists.
    let claimedAt: number;
    try {
      const existing = await head(pathname);
      claimedAt = new Date(existing.uploadedAt).getTime();
    } catch (error) {
      if (error instanceof BlobNotFoundError) fail("email-claim", beyondId, createError);
      fail("email-claim", beyondId, error);
    }
    if (now - claimedAt < EMAIL_CLAIM_STALE_MS) return "busy";
    try {
      await put(pathname, body, { ...options, allowOverwrite: true });
      return "claimed";
    } catch (error) {
      fail("email-claim", beyondId, error);
    }
  }
}

/** Releases the claim (after sending, or after a failed send so a retry can try again). */
export async function releaseEmailClaim(beyondId: string): Promise<void> {
  try {
    await del(emailClaimPathname(beyondId));
  } catch (error) {
    // Not fatal: a leftover claim goes stale and is taken over later.
    console.error(
      "[blob] could not release email claim",
      JSON.stringify({ beyondId, error: redact(error instanceof Error ? error.message : String(error)) }),
    );
  }
}

/**
 * Round trip against the real store: private put, head, get, delete of a
 * tiny test file. Reports which step failed, without secrets.
 */
export async function checkStorage(): Promise<{
  ok: boolean;
  auth: BlobAuthMode;
  steps: Record<string, string>;
}> {
  const auth = blobAuthMode();
  const steps: Record<string, string> = {};
  const pathname = `healthchecks/storage-check-${Date.now()}.txt`;
  const content = `bourzma-beyond storage check ${new Date().toISOString()}`;

  const step = async (name: string, run: () => Promise<string>) => {
    try {
      steps[name] = await run();
      return true;
    } catch (error) {
      const message = redact(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      steps[name] = `failed: ${message}`;
      console.error("[blob] storage check failed", JSON.stringify({ step: name, auth, error: message }));
      return false;
    }
  };

  const ok =
    (await step("put (private)", async () => {
      await put(pathname, content, { access: "private", contentType: "text/plain", addRandomSuffix: false });
      return "ok";
    })) &&
    (await step("head", async () => {
      await head(pathname);
      return "ok";
    })) &&
    (await step("get (private)", async () => {
      const result = await get(pathname, { access: "private" });
      if (!result || result.statusCode !== 200) throw new Error("no content returned");
      const text = await new Response(result.stream).text();
      if (text !== content) throw new Error("content mismatch");
      return "ok";
    })) &&
    (await step("delete", async () => {
      await del(pathname);
      return "ok";
    }));

  return { ok, auth, steps };
}
