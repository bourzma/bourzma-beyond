/** The five Beyond Types, in display order. */
export const BEYOND_TYPE_IDS = [
  "visionary",
  "connector",
  "maker",
  "catalyst",
  "rulebreaker",
] as const;

export type BeyondTypeId = (typeof BEYOND_TYPE_IDS)[number];

/**
 * When two or more types share the highest score, the one listed first here
 * wins. Types that rarely win outright come first; Maker is last because its
 * score comes from a single answer, so it already wins most often. Over all
 * 3,125 possible answer sets this is the most even of the 120 possible
 * orders. Do not change it after launch: the same answers must always give
 * the same type.
 */
export const TIE_BREAK_ORDER: readonly BeyondTypeId[] = [
  "visionary",
  "rulebreaker",
  "catalyst",
  "connector",
  "maker",
];

export interface BeyondType {
  id: BeyondTypeId;
  name: string;
  /** Short form for sentences, e.g. "a strong Maker side". */
  label: string;
  tagline: string;
}

export const BEYOND_TYPES: Record<BeyondTypeId, BeyondType> = {
  visionary: {
    id: "visionary",
    name: "THE VISIONARY",
    label: "Visionary",
    tagline: "You see possibilities before they become obvious.",
  },
  connector: {
    id: "connector",
    name: "THE CONNECTOR",
    label: "Connector",
    tagline: "You turn people into possibilities.",
  },
  maker: {
    id: "maker",
    name: "THE MAKER",
    label: "Maker",
    tagline: "Ideas are better when they become real.",
  },
  catalyst: {
    id: "catalyst",
    name: "THE CATALYST",
    label: "Catalyst",
    tagline: "You make things move.",
  },
  rulebreaker: {
    id: "rulebreaker",
    name: "THE RULEBREAKER",
    label: "Rulebreaker",
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

/**
 * "With a strong Rulebreaker side", or for several:
 * "With strong Rulebreaker and Catalyst sides". Empty string for none.
 */
export function describeStrongSides(ids: readonly BeyondTypeId[]): string {
  const labels = ids.map((id) => BEYOND_TYPES[id].label);
  if (labels.length === 0) return "";
  if (labels.length === 1) return `With a strong ${labels[0]} side`;
  const list = `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `With strong ${list} sides`;
}
