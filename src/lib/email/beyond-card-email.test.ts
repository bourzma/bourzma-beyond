import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/lib/beyond/projects";
import { CARD_CONTENT_ID, buildBeyondCardEmail } from "./beyond-card-email";

const boutique = PROJECTS.find((p) => p.id === "bourzma-boutique")!;

describe("buildBeyondCardEmail", () => {
  const email = buildBeyondCardEmail({ beyondType: "visionary", project: boutique });

  it("uses the agreed subject", () => {
    expect(email.subject).toBe("Your Beyond Card — THE VISIONARY");
  });

  it("follows the agreed structure, in order", () => {
    const order = [
      "BOURZMA",
      "BEYOND THE ORDINARY",
      "YOU'RE THE VISIONARY",
      "You see possibilities before they become obvious.",
      "THIS ONE FEELS LIKE YOU.",
      "BOURZMA BOUTIQUE",
      boutique.shortLine,
      boutique.whatWeDid,
    ];
    const positions = order.map((part) => email.text.indexOf(part));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("shows the card inline by content ID", () => {
    expect(email.html).toContain(`src="cid:${CARD_CONTENT_ID}"`);
    expect(email.html).toContain("You&rsquo;re the VISIONARY");
    expect(email.html).toContain("BOURZMA BOUTIQUE");
  });

  it("escapes project text", () => {
    const html = buildBeyondCardEmail({
      beyondType: "maker",
      project: { ...boutique, name: '<b>"X"</b>', whatWeDid: "a & b" },
    }).html;
    expect(html).toContain("&lt;b&gt;&quot;X&quot;&lt;/b&gt;");
    expect(html).toContain("a &amp; b");
  });
});
