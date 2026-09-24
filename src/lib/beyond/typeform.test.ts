import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractAnswers, verifyTypeformSignature } from "./typeform";

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
