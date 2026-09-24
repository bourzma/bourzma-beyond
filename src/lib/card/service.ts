import type { ContactDetails } from "@/lib/beyond/typeform";
import type { BeyondTypeId } from "@/lib/beyond/types";
import { beyondIdFor } from "./beyond-id";
import { generateCard } from "./generate";
import { cardExists, isCardStorageConfigured, saveCard } from "./store";

export type CardStatus =
  /** Generated and stored now. */
  | "generated"
  /** A card for this submission was stored before (Typeform retry): reused. */
  | "already-generated"
  /** Generated, but not stored: no Blob store connected (e.g. locally). */
  | "generated-not-stored";

export interface CardResult {
  beyondId: string;
  status: CardStatus;
  stored: boolean;
  width?: number;
  height?: number;
  bytes?: number;
}

/**
 * Creates the Beyond Card for one submission, idempotently: the Beyond ID
 * comes from the Typeform response token, so a retried webhook finds the
 * card it already stored and does not generate or store a second one.
 */
export async function createBeyondCard(input: {
  responseToken: string;
  contact: Pick<ContactDetails, "firstName" | "lastName" | "company">;
  beyondType: BeyondTypeId;
}): Promise<CardResult> {
  const beyondId = beyondIdFor(input.responseToken);
  const storage = isCardStorageConfigured();

  if (storage && (await cardExists(beyondId))) {
    return { beyondId, status: "already-generated", stored: true };
  }

  const card = generateCard(input);
  const size = { width: card.width, height: card.height, bytes: card.png.length };

  if (!storage) return { beyondId, status: "generated-not-stored", stored: false, ...size };

  await saveCard(beyondId, card.png);
  return { beyondId, status: "generated", stored: true, ...size };
}
