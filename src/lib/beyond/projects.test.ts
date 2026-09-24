import { describe, expect, it } from "vitest";
import { PROJECTS } from "./projects";
import { LOOKING_FOR_OPTIONS, WORKPLACE_TYPE_OPTIONS } from "./typeform";
import { isBeyondTypeId } from "./types";

describe("PROJECTS", () => {
  it("has unique ids and filled-in texts", () => {
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
    for (const p of PROJECTS) {
      expect(p.name).not.toBe("");
      expect(p.shortLine).not.toBe("");
      expect(p.whatWeDid).not.toBe("");
      expect(p.category.length).toBeGreaterThan(0);
      expect(p.bestAlignedWith.length).toBeGreaterThan(0);
      expect(p.bestAlignedWith.every(isBeyondTypeId)).toBe(true);
      expect(new Set(p.bestAlignedWith).size).toBe(p.bestAlignedWith.length);
    }
  });

  it("uses only exact Typeform option labels", () => {
    for (const p of PROJECTS) {
      for (const label of p.relevantLookingFor)
        expect(LOOKING_FOR_OPTIONS, `${p.id}: "${label}"`).toContain(label);
      for (const label of p.relevantWorkplaceTypes)
        expect(WORKPLACE_TYPE_OPTIONS, `${p.id}: "${label}"`).toContain(label);
    }
  });

  it("maps every option to at least one project, except Workplace_type Other", () => {
    const lookingFor = new Set(PROJECTS.flatMap((p) => p.relevantLookingFor));
    const workplace = new Set(PROJECTS.flatMap((p) => p.relevantWorkplaceTypes));
    expect([...LOOKING_FOR_OPTIONS].filter((o) => !lookingFor.has(o))).toEqual([]);
    expect([...WORKPLACE_TYPE_OPTIONS].filter((o) => !workplace.has(o))).toEqual(["Other"]);
  });

  it("gives every project its own email lead", () => {
    const leads = PROJECTS.map((p) => p.emailLead);
    expect(leads.every((l) => l.trim().length > 20)).toBe(true);
    expect(new Set(leads).size).toBe(PROJECTS.length);
    for (const p of PROJECTS) expect(p.emailLead).not.toBe(p.shortLine);
  });

  it("lists Delivery Van Redesign as a Maker project", () => {
    const van = PROJECTS.find((p) => p.id === "delivery-van-redesign");
    expect(van?.bestAlignedWith).toContain("maker");
  });
});
