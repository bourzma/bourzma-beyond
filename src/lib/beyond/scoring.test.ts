import { describe, expect, it } from "vitest";
import {
  InvalidAnswersError,
  calculateScores,
  parseAnswers,
  pickBeyondType,
  scoreAnswers,
  type Answers,
} from "./scoring";

const answers = (a: Partial<Answers> = {}): Answers => ({
  Social: 3,
  Curiosity: 3,
  Execution: 3,
  Connection: 3,
  Beyond_default: 3,
  ...a,
});

describe("calculateScores", () => {
  it("applies each formula", () => {
    const s = calculateScores(
      answers({ Social: 2, Curiosity: 4, Execution: 5, Connection: 1, Beyond_default: 3 }),
    );
    expect(s.visionary).toBe(3.5); // (4 + 3) / 2
    expect(s.connector).toBe(1.5); // (2 + 1) / 2
    expect(s.maker).toBe(5);
    expect(s.catalyst).toBe(3.5); // (2 + 5) / 2
    expect(s.rulebreaker).toBeCloseTo(10 / 3); // (2*3 + 4) / 3
  });
});

describe("pickBeyondType", () => {
  it.each([
    [answers({ Curiosity: 5, Beyond_default: 4 }), "visionary"],
    [answers({ Social: 5, Connection: 5 }), "connector"],
    [answers({ Execution: 5 }), "maker"],
    [answers({ Social: 5, Execution: 4, Connection: 1 }), "catalyst"],
    [answers({ Beyond_default: 5, Curiosity: 2 }), "rulebreaker"],
  ] as const)("picks the highest score (%#)", (a, expected) => {
    expect(pickBeyondType(a)).toBe(expected);
  });

  it("breaks ties by the fixed type order", () => {
    // All equal: visionary is listed first.
    expect(pickBeyondType(answers())).toBe("visionary");
    // Curiosity = Beyond_default makes Visionary and Rulebreaker equal.
    expect(pickBeyondType(answers({ Curiosity: 5, Beyond_default: 5 }))).toBe("visionary");
    // Maker = Catalyst = 5.
    expect(pickBeyondType(answers({ Social: 5, Execution: 5, Connection: 1 }))).toBe("maker");
  });

  it("is deterministic for every possible input", () => {
    const values = [1, 2, 3, 4, 5];
    for (const Social of values)
      for (const Curiosity of values)
        for (const Execution of values)
          for (const Connection of values)
            for (const Beyond_default of values) {
              const a = { Social, Curiosity, Execution, Connection, Beyond_default };
              const scores = calculateScores(a);
              const type = pickBeyondType(a);
              const max = Math.max(...Object.values(scores));
              expect(scores[type]).toBeCloseTo(max, 10);
              expect(pickBeyondType(a)).toBe(type);
            }
  });
});

describe("parseAnswers", () => {
  it("accepts numeric strings", () => {
    expect(
      parseAnswers({ Social: "1", Curiosity: "2", Execution: "3", Connection: "4", Beyond_default: "5" }),
    ).toEqual({ Social: 1, Curiosity: 2, Execution: 3, Connection: 4, Beyond_default: 5 });
  });

  it("rejects missing, out-of-range and non-integer answers", () => {
    try {
      parseAnswers({ Social: 0, Curiosity: 6, Execution: 2.5, Connection: "x" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAnswersError);
      expect((error as InvalidAnswersError).problems).toHaveLength(5);
    }
  });
});

describe("scoreAnswers", () => {
  it("returns answers, scores and the type", () => {
    const result = scoreAnswers(answers({ Execution: 5 }));
    expect(result.beyondType).toBe("maker");
    expect(result.scores.maker).toBe(5);
  });
});
