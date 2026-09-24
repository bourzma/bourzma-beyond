import { describe, expect, it } from "vitest";
import { resolveResult } from "./result";

const answers = {
  Social: "3",
  Curiosity: "5",
  Execution: "3",
  Connection: "3",
  Beyond_default: "4",
};

const ok = (query: Parameters<typeof resolveResult>[0]) => {
  const result = resolveResult(query);
  if (result.status !== "ok") throw new Error(result.problems.join("; "));
  return result;
};

describe("resolveResult", () => {
  it("scores the five answers and matches a project", () => {
    const r = ok(answers);
    expect(r.beyondType).toBe("visionary");
    expect(r.primaryProject.id).toBe("bourzma-boutique");
    expect(r.source).toBe("answers");
  });

  it("works without professional answers, and uses them when present", () => {
    expect(ok(answers).primaryProject.id).toBe("bourzma-boutique");
    // Visionary + Brands → Delivery Van Redesign (approved mapping).
    expect(ok({ ...answers, Looking_for: "Brands" }).primaryProject.id).toBe(
      "delivery-van-redesign",
    );
  });

  it("ignores empty professional answers", () => {
    expect(ok({ ...answers, Looking_for: "", Workplace_type: " " }).primaryProject.id).toBe(
      "bourzma-boutique",
    );
  });

  it("is not affected by extra parameters", () => {
    expect(ok({ ...answers, Company: "x", utm_source: "y" })).toEqual(ok(answers));
  });

  it("supports ?type= previews", () => {
    const r = ok({ type: "Maker" });
    expect(r).toMatchObject({ beyondType: "maker", source: "preview" });
    expect(r.primaryProject.id).toBe("worlds-largest-basketball-jersey");
  });

  it("reports missing or invalid answers", () => {
    expect(resolveResult({})).toMatchObject({ status: "invalid" });
    expect(resolveResult({ ...answers, Social: "7" })).toMatchObject({
      status: "invalid",
      problems: ["Social must be an integer from 1 to 5"],
    });
    expect(resolveResult({ type: "wizard" })).toMatchObject({ status: "invalid" });
  });
});
