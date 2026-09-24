import { describe, expect, it } from "vitest";
import { PROJECTS, matchProjects } from "./projects";
import { BEYOND_TYPE_IDS } from "./types";

const ids = (type: Parameters<typeof matchProjects>[0], limit?: number) =>
  matchProjects(type, PROJECTS, limit).map((p) => p.id);

describe("PROJECTS", () => {
  it("has unique ids and filled-in texts", () => {
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
    for (const p of PROJECTS) {
      expect(p.name).not.toBe("");
      expect(p.shortLine).not.toBe("");
      expect(p.whatWeDid).not.toBe("");
      expect(p.category.length).toBeGreaterThan(0);
      expect(p.bestAlignedWith.length).toBeGreaterThan(0);
    }
  });
});

describe("matchProjects", () => {
  it("returns at least one project for every type", () => {
    for (const id of BEYOND_TYPE_IDS) expect(matchProjects(id).length).toBeGreaterThan(0);
  });

  it("orders by alignment rank, then catalogue order", () => {
    expect(ids("visionary", 10)).toEqual([
      "bourzma-boutique",
      "delivery-van-redesign",
      "gaisma-tunela-gala",
      "bourzma-x-shopping-mall",
    ]);
    expect(ids("connector")).toEqual(["bourzma-x-shopping-mall", "bourzma-boutique"]);
    expect(ids("maker")).toEqual(["worlds-largest-basketball-jersey"]);
    expect(ids("catalyst")).toEqual([
      "delivery-van-redesign",
      "worlds-largest-basketball-jersey",
      "gaisma-tunela-gala",
    ]);
    expect(ids("rulebreaker")).toEqual([
      "gaisma-tunela-gala",
      "bourzma-boutique",
      "delivery-van-redesign",
    ]);
  });

  it("respects the limit", () => {
    expect(matchProjects("visionary", PROJECTS, 1)).toHaveLength(1);
  });
});
