import { describe, expect, it } from "vitest";
import { EMPTY_CONTEXT, matchProjects, type ProfessionalContext } from "./matching";
import { PROJECTS, type BeyondProject } from "./projects";
import { BEYOND_TYPE_IDS, type BeyondTypeId } from "./types";

// Test-only labels. The real ones come from the Typeform.
const withRelevance = (overrides: Record<string, Partial<BeyondProject>>): BeyondProject[] =>
  PROJECTS.map((p) => ({ ...p, ...overrides[p.id] }));

const fullFit: Partial<BeyondProject> = {
  relevantWorkplaceTypes: ["TEST_WORKPLACE"],
  relevantWorkAreas: ["TEST_AREA"],
  relevantIndustries: ["TEST_INDUSTRY"],
  relevantLookingFor: ["TEST_GOAL"],
};

const fullContext: ProfessionalContext = {
  workplaceType: ["TEST_WORKPLACE"],
  workArea: ["TEST_AREA"],
  industry: ["TEST_INDUSTRY"],
  lookingFor: ["TEST_GOAL"],
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

describe("matchProjects with professional context", () => {
  it("lets a strong fit lift a project one place", () => {
    // Visionary: Van is 2nd-aligned (20 + 15) and overtakes Boutique (30).
    const projects = withRelevance({ "delivery-van-redesign": fullFit });
    expect(pick("visionary", fullContext, projects)).toEqual([
      "delivery-van-redesign",
      "bourzma-boutique",
    ]);
  });

  it("never lifts a project two places", () => {
    // Visionary: Gaisma is 3rd-aligned (10 + 15 = 25) and stays below Boutique (30).
    const projects = withRelevance({ "gaisma-tunela-gala": fullFit });
    expect(pick("visionary", fullContext, projects)).toEqual([
      "bourzma-boutique",
      "gaisma-tunela-gala",
    ]);
  });

  it("uses context to choose between equally aligned projects", () => {
    // Catalyst: Jersey, Gaisma and Mall are all 2nd-aligned.
    const projects = withRelevance({
      "bourzma-x-shopping-mall": { relevantLookingFor: ["TEST_GOAL"] },
    });
    const context = { ...EMPTY_CONTEXT, lookingFor: ["TEST_GOAL"] };
    expect(pick("catalyst", context, projects)).toEqual([
      "delivery-van-redesign",
      "bourzma-x-shopping-mall",
    ]);
  });

  it("weights Looking for > Industry > Work area > Workplace type", () => {
    const m = matchProjects("maker", fullContext, withRelevance({
      "worlds-largest-basketball-jersey": fullFit,
    }));
    expect(m.ranking[0]).toMatchObject({
      typePoints: 30,
      contextPoints: 15,
      matchedOn: ["lookingFor", "industry", "workArea", "workplaceType"],
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
      "bourzma-x-shopping-mall": { relevantIndustries: ["Retail, fashion"] },
    });
    const score = (industry: string) =>
      matchProjects("catalyst", { ...EMPTY_CONTEXT, industry: [industry] }, projects)
        .ranking.find((s) => s.project.id === "bourzma-x-shopping-mall")!.contextPoints;
    expect(score("Retail, fashion")).toBe(4);
    expect(score("Media, retail, FASHION")).toBe(4);
    expect(score("  retail,  fashion ")).toBe(4);
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
