import { describe, expect, it } from "vitest";
import {
  InvalidAnswersError,
  calculateScores,
  parseAnswers,
  pickBeyondType,
  rankTypes,
  scoreAnswers,
  type Answers,
} from "./scoring";
import { BEYOND_TYPE_IDS, TIE_BREAK_ORDER } from "./types";

const answers = (a: Partial<Answers> = {}): Answers => ({
  Social: 3,
  Curiosity: 3,
  Execution: 3,
  Connection: 3,
  Beyond_default: 3,
  ...a,
});

function* allAnswers(): Generator<Answers> {
  const values = [1, 2, 3, 4, 5];
  for (const Social of values)
    for (const Curiosity of values)
      for (const Execution of values)
        for (const Connection of values)
          for (const Beyond_default of values)
            yield { Social, Curiosity, Execution, Connection, Beyond_default };
}

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

});

describe("rankTypes (tie-breaking)", () => {
  it("has no strong sides without a tie", () => {
    expect(rankTypes(answers({ Execution: 5 }))).toEqual({ beyondType: "maker", strongSides: [] });
  });

  it.each([
    // Curiosity = Beyond_default: Visionary and Rulebreaker tie.
    [answers({ Curiosity: 5, Beyond_default: 5 }), "visionary", ["rulebreaker"]],
    // Social = Execution: Maker and Catalyst tie.
    [answers({ Social: 5, Execution: 5, Connection: 1 }), "catalyst", ["maker"]],
    // Connection = Execution: Connector and Catalyst tie.
    [answers({ Social: 5, Connection: 4, Execution: 4, Curiosity: 1, Beyond_default: 1 }), "catalyst", ["connector"]],
    // All equal: every type ties.
    [answers(), "visionary", ["rulebreaker", "catalyst", "connector", "maker"]],
  ] as const)("follows the tie-break order (%#)", (a, type, sides) => {
    expect(rankTypes(a)).toEqual({ beyondType: type, strongSides: sides });
  });

  it("is correct and deterministic for every possible input", () => {
    for (const a of allAnswers()) {
      const scores = calculateScores(a);
      const max = Math.max(...Object.values(scores));
      const tied = TIE_BREAK_ORDER.filter((id) => Math.abs(scores[id] - max) < 1e-9);
      const { beyondType, strongSides } = rankTypes(a);
      expect([beyondType, ...strongSides]).toEqual(tied);
      expect(rankTypes(a)).toEqual({ beyondType, strongSides });
    }
  });

  it("keeps the agreed distribution over all 3,125 answer sets", () => {
    const counts = Object.fromEntries(BEYOND_TYPE_IDS.map((id) => [id, 0]));
    for (const a of allAnswers()) counts[pickBeyondType(a)]++;
    expect(counts).toEqual({
      visionary: 688,
      connector: 659,
      maker: 801,
      catalyst: 486,
      rulebreaker: 491,
    });
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
  it("returns answers, scores, the type and strong sides", () => {
    const result = scoreAnswers(answers({ Execution: 5 }));
    expect(result.beyondType).toBe("maker");
    expect(result.strongSides).toEqual([]);
    expect(result.scores.maker).toBe(5);
    expect(scoreAnswers(answers({ Curiosity: 5, Beyond_default: 5 })).strongSides).toEqual([
      "rulebreaker",
    ]);
  });
});
