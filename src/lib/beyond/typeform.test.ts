import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  extractAnswers,
  extractProfessionalContext,
  verifyTypeformSignature,
} from "./typeform";

describe("extractAnswers", () => {
  it("maps answers by field ref and ignores unknown refs", () => {
    const extracted = extractAnswers({
      form_response: {
        answers: [
          { type: "number", number: 4, field: { ref: "Social" } },
          { type: "number", number: 2, field: { ref: "Beyond_default" } },
          { type: "text", field: { ref: "email" } },
        ],
      },
    });
    expect(extracted).toEqual({ Social: 4, Beyond_default: 2 });
  });
});

describe("extractProfessionalContext", () => {
  // Test-only labels, not the real Typeform options.
  it("reads multi choice with Other, and single choice", () => {
    expect(
      extractProfessionalContext({
        form_response: {
          answers: [
            { type: "choices", choices: { labels: ["TEST_A", "TEST_B"], other: "TEST_OTHER" }, field: { ref: "Looking_for" } },
            { type: "choice", choice: { label: "TEST_WORKPLACE" }, field: { ref: "Workplace_type" } },
          ],
        },
      }),
    ).toEqual({
      lookingFor: ["TEST_A", "TEST_B", "TEST_OTHER"],
      workplaceType: ["TEST_WORKPLACE"],
    });
  });

  it("reads a single choice answered with Other", () => {
    expect(
      extractProfessionalContext({
        form_response: {
          answers: [{ type: "choice", choice: { other: "TEST_OTHER" }, field: { ref: "Workplace_type" } }],
        },
      }).workplaceType,
    ).toEqual(["TEST_OTHER"]);
  });

  it("ignores Role, contact fields and removed fields", () => {
    expect(
      extractProfessionalContext({
        form_response: {
          answers: [
            { type: "text", text: "TEST_ROLE", field: { ref: "Role" } },
            { type: "text", text: "TEST_COMPANY", field: { ref: "Company" } },
            { type: "choice", choice: { label: "TEST_X" }, field: { ref: "Industry" } },
            { type: "choice", choice: { label: "TEST_Y" }, field: { ref: "Work_area" } },
          ],
        },
      }),
    ).toEqual({ lookingFor: [], workplaceType: [] });
  });

  it("returns empty lists when the questions are missing", () => {
    expect(extractProfessionalContext({})).toEqual({ lookingFor: [], workplaceType: [] });
  });
});

describe("verifyTypeformSignature", () => {
  const body = '{"form_response":{}}';
  const sign = (secret: string) =>
    `sha256=${createHmac("sha256", secret).update(body).digest("base64")}`;

  it("accepts a correct signature", () => {
    expect(verifyTypeformSignature(body, sign("s3cret"), "s3cret")).toBe(true);
  });

  it("rejects a wrong or missing signature", () => {
    expect(verifyTypeformSignature(body, sign("other"), "s3cret")).toBe(false);
    expect(verifyTypeformSignature(body, null, "s3cret")).toBe(false);
  });
});
