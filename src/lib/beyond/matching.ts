import { PROJECTS, type BeyondProject } from "./projects";
import type { BeyondTypeId } from "./types";

/**
 * The respondent's professional answers, as Typeform option labels.
 * Each field is a list so single- and multi-select questions look the same.
 */
export interface ProfessionalContext {
  workplaceType: string[];
  workArea: string[];
  industry: string[];
  lookingFor: string[];
}

export const EMPTY_CONTEXT: ProfessionalContext = {
  workplaceType: [],
  workArea: [],
  industry: [],
  lookingFor: [],
};

/**
 * Points for where the Beyond Type sits in a project's bestAlignedWith list:
 * 1st place 30, 2nd place 20, 3rd place or later 10.
 */
export const TYPE_POINTS = [30, 20, 10] as const;

/**
 * Points for each professional field that matches. They add up to 15 at most,
 * which is more than one type step (10) but less than two (20): a strong
 * professional fit can lift a project one place, never two.
 */
export const CONTEXT_POINTS = {
  lookingFor: 6,
  industry: 4,
  workArea: 3,
  workplaceType: 2,
} as const;

const CONTEXT_FIELDS = {
  lookingFor: "relevantLookingFor",
  industry: "relevantIndustries",
  workArea: "relevantWorkAreas",
  workplaceType: "relevantWorkplaceTypes",
} as const satisfies Record<keyof ProfessionalContext, keyof BeyondProject>;

export interface ProjectScore {
  project: BeyondProject;
  /** Position of the Beyond Type in bestAlignedWith, or -1 if absent. */
  typeRank: number;
  typePoints: number;
  contextPoints: number;
  total: number;
  /** Which professional fields matched, for explaining the result. */
  matchedOn: (keyof ProfessionalContext)[];
}

export interface ProjectMatch {
  primary: BeyondProject;
  /** "Also for you". Never the same project as primary; null if none left. */
  secondary: BeyondProject | null;
  ranking: ProjectScore[];
}

const normalise = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * True if an answer contains the option label as a whole item. A single
 * answer string may hold several comma-separated labels (Typeform recall in a
 * redirect URL), so the label must sit between the start/end or ", ".
 */
function answerIncludes(answer: string, label: string): boolean {
  const a = normalise(answer);
  const l = normalise(label);
  if (!l) return false;
  let from = 0;
  for (let i = a.indexOf(l, from); i !== -1; i = a.indexOf(l, from)) {
    const startOk = i === 0 || a.slice(0, i).endsWith(", ") || a[i - 1] === ",";
    const end = i + l.length;
    const endOk = end === a.length || a[end] === ",";
    if (startOk && endOk) return true;
    from = i + 1;
  }
  return false;
}

function fieldMatches(answers: string[], relevant: string[]): boolean {
  return answers.some((answer) => relevant.some((label) => answerIncludes(answer, label)));
}

export function scoreProject(
  project: BeyondProject,
  type: BeyondTypeId,
  context: ProfessionalContext,
): ProjectScore {
  const typeRank = project.bestAlignedWith.indexOf(type);
  const typePoints =
    typeRank === -1 ? 0 : TYPE_POINTS[Math.min(typeRank, TYPE_POINTS.length - 1)];

  const matchedOn = (Object.keys(CONTEXT_POINTS) as (keyof ProfessionalContext)[]).filter(
    (field) => fieldMatches(context[field], project[CONTEXT_FIELDS[field]]),
  );
  const contextPoints = matchedOn.reduce((sum, field) => sum + CONTEXT_POINTS[field], 0);

  return { project, typeRank, typePoints, contextPoints, total: typePoints + contextPoints, matchedOn };
}

/**
 * Ranks every project and picks a primary and a secondary. Deterministic:
 * projects aligned with the Beyond Type always come before the rest; then
 * higher total wins; then better type position; then catalogue order.
 */
export function matchProjects(
  type: BeyondTypeId,
  context: ProfessionalContext = EMPTY_CONTEXT,
  projects: BeyondProject[] = PROJECTS,
): ProjectMatch {
  if (projects.length === 0) throw new Error("No projects to match");

  const aligned = (s: ProjectScore) => (s.typeRank === -1 ? 1 : 0);
  const rank = (s: ProjectScore) => (s.typeRank === -1 ? Infinity : s.typeRank);

  const ranking = projects
    .map((project, index) => ({ score: scoreProject(project, type, context), index }))
    .sort(
      (a, b) =>
        aligned(a.score) - aligned(b.score) ||
        b.score.total - a.score.total ||
        rank(a.score) - rank(b.score) ||
        a.index - b.index,
    )
    .map((entry) => entry.score);

  return {
    primary: ranking[0].project,
    secondary: ranking[1]?.project ?? null,
    ranking,
  };
}
