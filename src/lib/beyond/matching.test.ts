import { describe, expect, it } from "vitest";
import { EMPTY_CONTEXT, matchProjects, type ProfessionalContext } from "./matching";
import { PROJECTS, type BeyondProject } from "./projects";
import { LOOKING_FOR_OPTIONS, WORKPLACE_TYPE_OPTIONS } from "./typeform";
import { BEYOND_TYPE_IDS, type BeyondTypeId } from "./types";

// TEST_* labels below are test-only and never match the real options.
const withRelevance = (overrides: Record<string, Partial<BeyondProject>>): BeyondProject[] =>
  PROJECTS.map((p) => ({ ...p, ...overrides[p.id] }));

const lookingForFit: Partial<BeyondProject> = { relevantLookingFor: ["TEST_GOAL"] };
const workplaceFit: Partial<BeyondProject> = { relevantWorkplaceTypes: ["TEST_WORKPLACE"] };
const fullFit: Partial<BeyondProject> = { ...lookingForFit, ...workplaceFit };

const fullContext: ProfessionalContext = {
  lookingFor: ["TEST_GOAL"],
  workplaceType: ["TEST_WORKPLACE"],
};

const pick = (type: BeyondTypeId, context = EMPTY_CONTEXT, projects = PROJECTS) => {
  const m = matchProjects(type, context, projects);
  return [m.primary.id, m.secondary?.id ?? null];
};

describe("matchProjects with the Beyond Type only", () => {
  it.each([
    ["visionary", "bourzma-boutique", "delivery-van-redesign"],
    ["connector", "bourzma-x-shopping-mall", "bourzma-boutique"],
    ["maker", "worlds-largest-basketball-jersey", "delivery-van-redesign"],
    ["catalyst", "delivery-van-redesign", "worlds-largest-basketball-jersey"],
    ["rulebreaker", "gaisma-tunela-gala", "bourzma-boutique"],
  ] as const)("%s → %s, also %s", (type, primary, secondary) => {
    expect(pick(type)).toEqual([primary, secondary]);
  });
});

describe("matchProjects with the approved Looking_for mapping", () => {
  const B = "bourzma-boutique";
  const J = "worlds-largest-basketball-jersey";
  const V = "delivery-van-redesign";
  const G = "gaisma-tunela-gala";
  const M = "bourzma-x-shopping-mall";

  // [Looking_for, visionary, connector, maker, catalyst, rulebreaker]
  // Each cell: [primary, secondary]. Approved 2026-09-24.
  const table: [string, ...[string, string][]][] = [
    ["New collaborations", [B, M], [M, B], [J, V], [M, V], [G, B]],
    ["Creative partners", [B, G], [B, M], [J, V], [G, V], [G, B]],
    ["Brands", [V, B], [M, B], [J, V], [V, J], [G, V]],
    ["Clients", [V, B], [M, B], [J, V], [V, J], [G, V]],
    ["Event opportunities", [B, G], [M, B], [J, V], [J, G], [G, B]],
    ["Designers & creators", [B, V], [B, M], [J, V], [V, J], [G, B]],
    ["Production", [V, B], [M, B], [J, V], [V, J], [G, V]],
    ["Marketing & communication", [V, B], [M, B], [J, V], [V, M], [G, V]],
    ["Sustainability projects", [B, G], [B, M], [J, V], [G, V], [G, B]],
    ["Inspiration", [B, G], [B, M], [J, V], [G, V], [G, B]],
    ["New people", [B, M], [M, B], [J, V], [M, V], [G, B]],
    ["Something unexpected", [B, G], [M, B], [J, V], [J, G], [G, B]],
  ];

  it.each(table)("%s", (lookingFor, ...cells) => {
    BEYOND_TYPE_IDS.forEach((type, i) => {
      expect(pick(type, { ...EMPTY_CONTEXT, lookingFor: [lookingFor] }), type).toEqual(cells[i]);
    });
  });

  it("gives a valid pair for every type × Looking_for × Workplace_type", () => {
    for (const type of BEYOND_TYPE_IDS)
      for (const lookingFor of LOOKING_FOR_OPTIONS)
        for (const workplaceType of WORKPLACE_TYPE_OPTIONS) {
          const m = matchProjects(type, { lookingFor: [lookingFor], workplaceType: [workplaceType] });
          expect(m.primary.bestAlignedWith).toContain(type);
          expect(m.secondary?.bestAlignedWith).toContain(type);
          expect(m.secondary!.id).not.toBe(m.primary.id);
        }
  });
});

describe("matchProjects with professional context", () => {
  it("lets a Looking_for match lift a project one place", () => {
    // Visionary: Van is 2nd-aligned (20 + 12 = 32) and overtakes Boutique (30).
    const projects = withRelevance({ "delivery-van-redesign": lookingForFit });
    expect(pick("visionary", fullContext, projects)).toEqual([
      "delivery-van-redesign",
      "bourzma-boutique",
    ]);
  });

  it("does not let a Workplace_type match alone lift a project", () => {
    // Visionary: Van (20 + 4 = 24) stays below Boutique (30).
    const projects = withRelevance({ "delivery-van-redesign": workplaceFit });
    expect(pick("visionary", fullContext, projects)).toEqual([
      "bourzma-boutique",
      "delivery-van-redesign",
    ]);
  });

  it("never lifts a project two places", () => {
    // Visionary: Gaisma is 3rd-aligned (10 + 16 = 26) and stays below Boutique (30).
    const projects = withRelevance({ "gaisma-tunela-gala": fullFit });
    expect(pick("visionary", fullContext, projects)).toEqual([
      "bourzma-boutique",
      "gaisma-tunela-gala",
    ]);
  });

  it("uses Workplace_type to choose between equally placed projects", () => {
    // Catalyst: Jersey, Gaisma and Mall are all 2nd-aligned (20 each).
    const projects = withRelevance({ "bourzma-x-shopping-mall": workplaceFit });
    expect(pick("catalyst", fullContext, projects)).toEqual([
      "delivery-van-redesign",
      "bourzma-x-shopping-mall",
    ]);
  });

  it("weights Looking_for above Workplace_type", () => {
    // Catalyst: Gaisma (20 + 12) > Van (30) > Jersey (20 + 4).
    const projects = withRelevance({
      "gaisma-tunela-gala": lookingForFit,
      "worlds-largest-basketball-jersey": workplaceFit,
    });
    const ranking = matchProjects("catalyst", fullContext, projects).ranking;
    expect(ranking.slice(0, 3).map((s) => [s.project.id, s.total])).toEqual([
      ["gaisma-tunela-gala", 32],
      ["delivery-van-redesign", 30],
      ["worlds-largest-basketball-jersey", 24],
    ]);
    expect(ranking[0].matchedOn).toEqual(["lookingFor"]);
  });

  it("adds both signals when both match", () => {
    const m = matchProjects("maker", fullContext, withRelevance({
      "worlds-largest-basketball-jersey": fullFit,
    }));
    expect(m.ranking[0]).toMatchObject({
      typePoints: 30,
      contextPoints: 16,
      matchedOn: ["lookingFor", "workplaceType"],
    });
  });

  it("never picks an unaligned project over an aligned one", () => {
    // Connector: Jersey is not aligned, however well it fits.
    const projects = withRelevance({ "worlds-largest-basketball-jersey": fullFit });
    expect(pick("connector", fullContext, projects)).toEqual([
      "bourzma-x-shopping-mall",
      "bourzma-boutique",
    ]);
  });

  it("matches labels inside comma-separated answers, whole items only", () => {
    const projects = withRelevance({
      "bourzma-x-shopping-mall": { relevantLookingFor: ["Retail, fashion"] },
    });
    const score = (lookingFor: string) =>
      matchProjects("catalyst", { ...EMPTY_CONTEXT, lookingFor: [lookingFor] }, projects)
        .ranking.find((s) => s.project.id === "bourzma-x-shopping-mall")!.contextPoints;
    expect(score("Retail, fashion")).toBe(12);
    expect(score("Media, retail, FASHION")).toBe(12);
    expect(score("  retail,  fashion ")).toBe(12);
    expect(score("Retail, fashion design")).toBe(0);
    expect(score("E-retail, fashion")).toBe(0);
  });

  it("always gives a primary and a different secondary", () => {
    const contexts = [EMPTY_CONTEXT, fullContext];
    const catalogues = [PROJECTS, ...PROJECTS.map((p) => withRelevance({ [p.id]: fullFit }))];
    for (const type of BEYOND_TYPE_IDS)
      for (const context of contexts)
        for (const projects of catalogues) {
          const m = matchProjects(type, context, projects);
          expect(m.primary.bestAlignedWith).toContain(type);
          expect(m.secondary).not.toBeNull();
          expect(m.secondary!.id).not.toBe(m.primary.id);
          expect(matchProjects(type, context, projects)).toEqual(m);
        }
  });

  it("returns no secondary when there is only one project", () => {
    expect(matchProjects("maker", EMPTY_CONTEXT, [PROJECTS[1]]).secondary).toBeNull();
  });
});
