import type { BeyondTypeId } from "./types";

export interface BeyondProject {
  id: string;
  title: string;
  description: string;
  /** Types this project suits, most relevant first. */
  types: BeyondTypeId[];
}

/**
 * PLACEHOLDER catalogue. Replace with the real Bourzma projects.
 * The matching logic below does not depend on the content.
 */
export const PROJECTS: BeyondProject[] = [
  {
    id: "future-wardrobe-lab",
    title: "Future Wardrobe Lab",
    description: "Sketch what a sustainable wardrobe looks like ten years from now.",
    types: ["visionary", "rulebreaker"],
  },
  {
    id: "swap-circle",
    title: "Swap Circle",
    description: "Host a clothing swap that brings your community together.",
    types: ["connector", "catalyst"],
  },
  {
    id: "upcycle-studio",
    title: "Upcycle Studio",
    description: "Turn a worn-out garment into something new with your own hands.",
    types: ["maker", "rulebreaker"],
  },
  {
    id: "repair-sprint",
    title: "Repair Sprint",
    description: "Organise a one-day repair event and get things fixed fast.",
    types: ["catalyst", "maker"],
  },
  {
    id: "anti-trend-manifesto",
    title: "Anti-Trend Manifesto",
    description: "Write the rules for fashion that ignores the default.",
    types: ["rulebreaker", "visionary"],
  },
  {
    id: "story-behind-the-seam",
    title: "Story Behind the Seam",
    description: "Interview the people who make clothes and share their stories.",
    types: ["connector", "visionary"],
  },
];

/**
 * Projects that list the given type, ordered by how high the type appears in
 * each project's list, then by catalogue order. Deterministic.
 */
export function matchProjects(
  type: BeyondTypeId,
  projects: BeyondProject[] = PROJECTS,
  limit = 3,
): BeyondProject[] {
  return projects
    .map((project, index) => ({ project, index, rank: project.types.indexOf(type) }))
    .filter((entry) => entry.rank !== -1)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.project);
}
