import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import submission from "./fixtures/typeform-submission.json";
import {
  extractAnswers,
  extractContactDetails,
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

describe("extractContactDetails", () => {
  it("reads text, email, website and consent answers", () => {
    expect(extractContactDetails(submission)).toMatchObject({
      firstName: "Jane",
      email: "jane@example.com",
      linkedin: "https://www.linkedin.com/in/jane-example",
      marketingConsent: true,
    });
  });

  it("uses a single Name question for the full name", () => {
    const text = (ref: string, value: string) => ({ type: "text", text: value, field: { ref } });
    expect(
      extractContactDetails({ form_response: { answers: [text("Name", "  Anna Bērziņa ")] } }).fullName,
    ).toBe("Anna Bērziņa");
    expect(
      extractContactDetails({ form_response: { answers: [text("Full_name", "Sam Rivera")] } }).fullName,
    ).toBe("Sam Rivera");
  });

  it("joins First_name and Last_name when the form still asks them separately", () => {
    expect(extractContactDetails(submission).fullName).toBe("Jane Example");
    const onlyFirst = extractContactDetails({
      form_response: { answers: [{ type: "text", text: "Jane", field: { ref: "First_name" } }] },
    });
    expect(onlyFirst.fullName).toBe("Jane");
  });

  it("returns nulls when contact questions are missing", () => {
    expect(extractContactDetails({})).toEqual({
      fullName: null,
      firstName: null,
      lastName: null,
      company: null,
      role: null,
      email: null,
      linkedin: null,
      marketingConsent: null,
      marketingConsentRaw: null,
    });
  });

  it("keeps a non-boolean consent answer as raw text", () => {
    const consent = extractContactDetails({
      form_response: {
        answers: [{ type: "choice", choice: { label: "TEST_YES" }, field: { ref: "Marketing_consent" } }],
      },
    });
    expect(consent).toMatchObject({ marketingConsent: null, marketingConsentRaw: "TEST_YES" });
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
