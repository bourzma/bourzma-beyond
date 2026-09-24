/**
 * The five Beyond Types.
 *
 * BEYOND_TYPE_IDS is also the tie-break order used by scoring: when two or
 * more types share the highest score, the one listed first wins.
 */
export const BEYOND_TYPE_IDS = [
  "visionary",
  "connector",
  "maker",
  "catalyst",
  "rulebreaker",
] as const;

export type BeyondTypeId = (typeof BEYOND_TYPE_IDS)[number];

export interface BeyondType {
  id: BeyondTypeId;
  name: string;
  tagline: string;
}

export const BEYOND_TYPES: Record<BeyondTypeId, BeyondType> = {
  visionary: {
    id: "visionary",
    name: "THE VISIONARY",
    tagline: "You see possibilities before they become obvious.",
  },
  connector: {
    id: "connector",
    name: "THE CONNECTOR",
    tagline: "You turn people into possibilities.",
  },
  maker: {
    id: "maker",
    name: "THE MAKER",
    tagline: "Ideas are better when they become real.",
  },
  catalyst: {
    id: "catalyst",
    name: "THE CATALYST",
    tagline: "You make things move.",
  },
  rulebreaker: {
    id: "rulebreaker",
    name: "THE RULEBREAKER",
    tagline: "The default setting was never really your thing.",
  },
};

export function isBeyondTypeId(value: unknown): value is BeyondTypeId {
  return (
    typeof value === "string" &&
    (BEYOND_TYPE_IDS as readonly string[]).includes(value)
  );
}

export function getBeyondType(id: BeyondTypeId): BeyondType {
  return BEYOND_TYPES[id];
}
