import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/lib/beyond/projects";
import {
  ALWAYS_LOOKING,
  CARD_CONTENT_ID,
  LOGO_CONTENT_ID,
  THANK_YOU,
  buildBeyondCardEmail,
} from "./beyond-card-email";

const jersey = PROJECTS.find((p) => p.id === "worlds-largest-basketball-jersey")!;

describe("buildBeyondCardEmail", () => {
  const email = buildBeyondCardEmail({ beyondType: "visionary", project: jersey });

  it("uses the agreed subject", () => {
    expect(email.subject).toBe("Your Beyond Card — THE VISIONARY");
  });

  it("thanks first, then the type and card, then the project", () => {
    const order = [
      "BOURZMA",
      "BEYOND THE ORDINARY",
      THANK_YOU,
      ALWAYS_LOOKING,
      "YOU'RE THE VISIONARY",
      "You see possibilities before they become obvious",
      "Your Beyond Card is attached.",
      "THIS ONE FEELS LIKE YOU.",
      jersey.name,
      jersey.emailLead,
      jersey.whatWeDid,
    ];
    const positions = order.map((part) => email.text.indexOf(part));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("uses the project's email lead instead of its short line", () => {
    expect(email.html).toContain(jersey.emailLead.replace(/'/g, "&#39;"));
    expect(email.text).not.toContain(jersey.shortLine);
  });

  it("thanks people for being on the journey", () => {
    expect(THANK_YOU).toBe("Thank you for being with us on this journey.");
  });

  it("ends with links to bourzma.com, Instagram and LinkedIn", () => {
    for (const url of [
      "https://bourzma.com",
      "https://www.instagram.com/bourzma_/",
      "https://www.linkedin.com/company/bourzma/",
    ]) {
      expect(email.html).toContain(`href="${url}"`);
      expect(email.text).toContain(url);
    }
    expect(email.html.indexOf("instagram.com")).toBeGreaterThan(email.html.indexOf(jersey.whatWeDid.slice(0, 20)));
  });

  it("shows the logo and the card inline by content ID", () => {
    expect(email.html).toContain(`src="cid:${LOGO_CONTENT_ID}"`);
    expect(email.html).toContain(`src="cid:${CARD_CONTENT_ID}"`);
    expect(email.html.indexOf(LOGO_CONTENT_ID)).toBeLessThan(email.html.indexOf(CARD_CONTENT_ID));
  });

  it("escapes project text", () => {
    const html = buildBeyondCardEmail({
      beyondType: "maker",
      project: { ...jersey, name: '<b>"X"</b>', whatWeDid: "a & b" },
    }).html;
    expect(html).toContain("&lt;b&gt;&quot;X&quot;&lt;/b&gt;");
    expect(html).toContain("a &amp; b");
  });
});
