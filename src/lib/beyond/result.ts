import { matchProjects } from "./matching";
import type { BeyondProject } from "./projects";
import { FIELD_REFS, InvalidAnswersError, scoreAnswers } from "./scoring";
import { PROFESSIONAL_FIELD_REFS } from "./typeform";
import { isBeyondTypeId, type BeyondTypeId } from "./types";

export type ResultQuery = Record<string, string | string[] | undefined>;

export type ResolvedResult =
  | {
      status: "ok";
      beyondType: BeyondTypeId;
      primaryProject: BeyondProject;
      /** "answers" for real respondents, "preview" for ?type= test links. */
      source: "answers" | "preview";
    }
  | { status: "invalid"; problems: string[] };

/**
 * Everything the /result page needs, from URL parameters only:
 *   Social, Curiosity, Execution, Connection, Beyond_default  (1–5, required)
 *   Looking_for, Workplace_type                                (optional)
 * or, for previews, type=<beyond type id> instead of the five answers.
 * Deterministic: the same parameters always give the same result.
 */
export function resolveResult(query: ResultQuery): ResolvedResult {
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const answersFor = (ref: string) => {
    const value = first(ref)?.trim();
    return value ? [value] : [];
  };

  let beyondType: BeyondTypeId;
  let source: "answers" | "preview";

  const requestedType = first("type")?.toLowerCase();
  if (isBeyondTypeId(requestedType)) {
    beyondType = requestedType;
    source = "preview";
  } else {
    try {
      beyondType = scoreAnswers(
        Object.fromEntries(FIELD_REFS.map((ref) => [ref, first(ref)])),
      ).beyondType;
      source = "answers";
    } catch (error) {
      if (!(error instanceof InvalidAnswersError)) throw error;
      return { status: "invalid", problems: error.problems };
    }
  }

  const { primary } = matchProjects(beyondType, {
    lookingFor: answersFor(PROFESSIONAL_FIELD_REFS.lookingFor),
    workplaceType: answersFor(PROFESSIONAL_FIELD_REFS.workplaceType),
  });

  return { status: "ok", beyondType, primaryProject: primary, source };
}
