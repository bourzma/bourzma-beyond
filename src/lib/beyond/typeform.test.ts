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
  it("reads single choice, multi choice, Other and text answers", () => {
    expect(
      extractProfessionalContext({
        form_response: {
          answers: [
            { type: "choice", choice: { label: "Agency" }, field: { ref: "Workplace_type" } },
            { type: "choices", choices: { labels: ["A", "B"], other: "C" }, field: { ref: "Looking_for" } },
            { type: "choice", choice: { other: "Space tech" }, field: { ref: "Industry" } },
            { type: "text", text: "Marketing", field: { ref: "Work_area" } },
            { type: "text", text: "Jane", field: { ref: "First_name" } },
          ],
        },
      }),
    ).toEqual({
      workplaceType: ["Agency"],
      workArea: ["Marketing"],
      industry: ["Space tech"],
      lookingFor: ["A", "B", "C"],
    });
  });

  it("returns empty lists when the questions are missing", () => {
    expect(extractProfessionalContext({})).toEqual({
      workplaceType: [],
      workArea: [],
      industry: [],
      lookingFor: [],
    });
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
