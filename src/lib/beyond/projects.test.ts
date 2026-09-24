import { describe, expect, it } from "vitest";
import { PROJECTS, matchProjects } from "./projects";
import { BEYOND_TYPE_IDS } from "./types";

describe("matchProjects", () => {
  it("returns at least one project for every type", () => {
    for (const id of BEYOND_TYPE_IDS) expect(matchProjects(id).length).toBeGreaterThan(0);
  });

  it("puts projects where the type is primary first", () => {
    const ids = matchProjects("rulebreaker", PROJECTS, 10).map((p) => p.id);
    expect(ids[0]).toBe("anti-trend-manifesto");
    expect(ids).toEqual(["anti-trend-manifesto", "future-wardrobe-lab", "upcycle-studio"]);
  });

  it("respects the limit", () => {
    expect(matchProjects("visionary", PROJECTS, 1)).toHaveLength(1);
  });
});
