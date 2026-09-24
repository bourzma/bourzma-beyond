import { describe, expect, it } from "vitest";
import { BEYOND_TYPE_IDS, getBeyondType, type BeyondTypeId } from "@/lib/beyond/types";
import { beyondIdFor, isBeyondId } from "./beyond-id";
import { generateCard } from "./generate";
import { CARD_WIDTH, buildCardSvg, type CardData } from "./template";
import { fitLine } from "./text";

const base: CardData = {
  firstName: "Anna",
  lastName: "Bērziņa",
  company: "Bourzma",
  beyondType: "visionary",
  beyondId: "BYD-ETXQ-97CX",
};

/** x coordinates of all dynamic text (everything after the background <svg>). */
function textXs(svg: string): number[] {
  const text = svg.slice(svg.lastIndexOf("</svg>", svg.length - 7) + 6);
  const xs: number[] = [];
  for (const [, d] of text.matchAll(/<path d="([^"]+)"/g)) {
    const nums = d.match(/-?\d*\.?\d+(?:e-?\d+)?/g)!.map(Number);
    for (let i = 0; i < nums.length; i += 2) xs.push(nums[i]);
  }
  return xs;
}

describe("beyondIdFor", () => {
  it("is stable and well-formed", () => {
    expect(beyondIdFor("sample-visionary")).toBe("BYD-ETXQ-97CX");
    expect(beyondIdFor("abc")).toBe(beyondIdFor("abc"));
    expect(beyondIdFor("abc")).not.toBe(beyondIdFor("abd"));
    for (let i = 0; i < 200; i++) expect(isBeyondId(beyondIdFor(`token-${i}`))).toBe(true);
  });

  it("requires a token", () => {
    expect(() => beyondIdFor("")).toThrow();
  });
});

describe("buildCardSvg", () => {
  it("is deterministic", () => {
    expect(buildCardSvg(base)).toBe(buildCardSvg({ ...base }));
  });

  it("never puts typed text into the SVG markup", () => {
    const svg = buildCardSvg({
      ...base,
      firstName: '<script>alert("x")</script>',
      company: "\" onload=\"alert(1)",
    });
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("onload");
  });

  const long: Partial<CardData>[] = [
    { firstName: "Maximilian-Alexander", lastName: "Vanderbergh-Montgomery" },
    { firstName: "Wolfeschlegelsteinhausenbergerdorffvoralternwarengewissenhaft", lastName: null },
    { firstName: "Анастасия-Александра", lastName: "Кузнецова-Преображенская" },
    { company: "The International Association of Sustainable Fashion Designers and Upcyclers" },
    { company: "W".repeat(120) },
    { firstName: "Ā ".repeat(80), lastName: null },
  ];

  it.each(long)("keeps text inside the margins: %o", (override) => {
    for (const beyondType of BEYOND_TYPE_IDS as readonly BeyondTypeId[]) {
      const xs = textXs(buildCardSvg({ ...base, ...override, beyondType }));
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(15.58 - 0.5);
      expect(Math.max(...xs)).toBeLessThanOrEqual(CARD_WIDTH - 15.58 + 0.5);
    }
  });

  it("never cuts a Beyond Type name (it only shrinks)", () => {
    // Same box as the template: centred on 152.84 inside the right margin.
    const width = 2 * (CARD_WIDTH - 15.58 - 152.84);
    for (const id of BEYOND_TYPE_IDS) {
      const name = getBeyondType(id).name;
      expect(fitLine(name, { font: "headline", size: 12.32 }, width, 8).text).toBe(name);
    }
  });
});

describe("generateCard", () => {
  it("renders a 2160 × 1400 PNG", () => {
    const card = generateCard({
      responseToken: "sample-visionary",
      contact: { firstName: "Anna", lastName: "Bērziņa", company: "Bourzma" },
      beyondType: "visionary",
    });
    expect(card.beyondId).toBe("BYD-ETXQ-97CX");
    expect(card.png.subarray(1, 4).toString()).toBe("PNG");
    expect(card.png.readUInt32BE(16)).toBe(2160);
    expect(card.png.readUInt32BE(20)).toBe(1400);
    expect([card.width, card.height]).toEqual([2160, 1400]);
  });
});
