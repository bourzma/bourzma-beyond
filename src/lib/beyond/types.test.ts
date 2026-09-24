import { describe, expect, it } from "vitest";
import { BEYOND_TYPE_IDS, TIE_BREAK_ORDER, describeStrongSides } from "./types";

describe("TIE_BREAK_ORDER", () => {
  it("contains every type exactly once", () => {
    expect([...TIE_BREAK_ORDER].sort()).toEqual([...BEYOND_TYPE_IDS].sort());
  });
});

describe("describeStrongSides", () => {
  it("formats zero, one and several sides", () => {
    expect(describeStrongSides([])).toBe("");
    expect(describeStrongSides(["rulebreaker"])).toBe("With a strong Rulebreaker side");
    expect(describeStrongSides(["rulebreaker", "catalyst"])).toBe(
      "With strong Rulebreaker and Catalyst sides",
    );
    expect(describeStrongSides(["rulebreaker", "catalyst", "maker"])).toBe(
      "With strong Rulebreaker, Catalyst and Maker sides",
    );
  });
});
