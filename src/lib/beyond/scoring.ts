import { BEYOND_TYPE_IDS, type BeyondTypeId } from "./types";

/** Typeform field references, exactly as configured in the form. */
export const FIELD_REFS = [
  "Social",
  "Curiosity",
  "Execution",
  "Connection",
  "Beyond_default",
] as const;

export type FieldRef = (typeof FIELD_REFS)[number];

/** One answer per field ref, each an integer from 1 to 5. */
export type Answers = Record<FieldRef, number>;

export type TypeScores = Record<BeyondTypeId, number>;

export interface ScoreResult {
  answers: Answers;
  scores: TypeScores;
  beyondType: BeyondTypeId;
}

export const MIN_ANSWER = 1;
export const MAX_ANSWER = 5;

export class InvalidAnswersError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid answers: ${problems.join("; ")}`);
    this.name = "InvalidAnswersError";
  }
}

/**
 * Checks that every field ref is present and is an integer from 1 to 5.
 * Accepts numeric strings (e.g. from URL query params).
 */
export function parseAnswers(input: Partial<Record<string, unknown>>): Answers {
  const problems: string[] = [];
  const answers = {} as Answers;

  for (const ref of FIELD_REFS) {
    const raw = input[ref];
    const value =
      typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;

    if (value === undefined || value === null) {
      problems.push(`${ref} is missing`);
    } else if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < MIN_ANSWER ||
      value > MAX_ANSWER
    ) {
      problems.push(`${ref} must be an integer from ${MIN_ANSWER} to ${MAX_ANSWER}`);
    } else {
      answers[ref] = value;
    }
  }

  if (problems.length > 0) throw new InvalidAnswersError(problems);
  return answers;
}

/**
 * Every score multiplied by 6 (the lowest common denominator of the
 * averages below), so the comparison uses whole numbers only and never hits
 * floating-point rounding.
 */
function scaledScores(a: Answers): TypeScores {
  return {
    visionary: 3 * (a.Curiosity + a.Beyond_default),
    connector: 3 * (a.Social + a.Connection),
    maker: 6 * a.Execution,
    catalyst: 3 * (a.Social + a.Execution),
    // Weighted average: Beyond_default counts twice, Curiosity once.
    rulebreaker: 2 * (2 * a.Beyond_default + a.Curiosity),
  };
}

/** Type scores on the same 1–5 scale as the answers. */
export function calculateScores(answers: Answers): TypeScores {
  const scaled = scaledScores(answers);
  const scores = {} as TypeScores;
  for (const id of BEYOND_TYPE_IDS) scores[id] = scaled[id] / 6;
  return scores;
}

/**
 * The highest-scoring type. On a tie, the type listed first in
 * BEYOND_TYPE_IDS wins.
 */
export function pickBeyondType(answers: Answers): BeyondTypeId {
  const scaled = scaledScores(answers);
  let best: BeyondTypeId = BEYOND_TYPE_IDS[0];
  for (const id of BEYOND_TYPE_IDS) {
    if (scaled[id] > scaled[best]) best = id;
  }
  return best;
}

export function scoreAnswers(input: Partial<Record<string, unknown>>): ScoreResult {
  const answers = parseAnswers(input);
  return {
    answers,
    scores: calculateScores(answers),
    beyondType: pickBeyondType(answers),
  };
}
