import { describe, expect, it } from "vitest";
import { PROJECTS } from "./projects";
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

  it("lists Delivery Van Redesign as a Maker project", () => {
    const van = PROJECTS.find((p) => p.id === "delivery-van-redesign");
    expect(van?.bestAlignedWith).toContain("maker");
  });
});
