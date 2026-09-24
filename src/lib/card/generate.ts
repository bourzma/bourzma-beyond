import type { ContactDetails } from "@/lib/beyond/typeform";
import type { BeyondTypeId } from "@/lib/beyond/types";
import { beyondIdFor } from "./beyond-id";
import { OUTPUT_WIDTH, renderPng } from "./render";
import { CARD_HEIGHT, CARD_WIDTH, buildCardSvg } from "./template";

export interface GeneratedCard {
  beyondId: string;
  svg: string;
  png: Buffer;
  width: number;
  height: number;
}

/** Builds the Beyond Card for one scored submission. Deterministic. */
export function generateCard(input: {
  responseToken: string;
  contact: Pick<ContactDetails, "firstName" | "lastName" | "company">;
  beyondType: BeyondTypeId;
}): GeneratedCard {
  const beyondId = beyondIdFor(input.responseToken);
  const svg = buildCardSvg({
    firstName: input.contact.firstName,
    lastName: input.contact.lastName,
    company: input.contact.company,
    beyondType: input.beyondType,
    beyondId,
  });
  return {
    beyondId,
    svg,
    png: renderPng(svg),
    width: OUTPUT_WIDTH,
    height: Math.round((OUTPUT_WIDTH * CARD_HEIGHT) / CARD_WIDTH),
  };
}
