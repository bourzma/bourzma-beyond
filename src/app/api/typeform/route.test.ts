import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import submission from "@/lib/beyond/fixtures/typeform-submission.json";
import { POST } from "./route";

const SECRET = "test-secret";
const body = JSON.stringify(submission);
const sign = (raw: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(raw).digest("base64")}`;

const post = (raw: string, signature?: string) =>
  POST(
    new Request("http://localhost/api/typeform", {
      method: "POST",
      headers: signature ? { "typeform-signature": signature } : {},
      body: raw,
    }),
  );

describe("POST /api/typeform", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("parses a signed submission completely", async () => {
    vi.stubEnv("TYPEFORM_WEBHOOK_SECRET", SECRET);
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.contact).toEqual({
      firstName: "Jane",
      lastName: "Example",
      company: "Example Studio",
      role: "Creative Director",
      email: "jane@example.com",
      linkedin: "https://www.linkedin.com/in/jane-example",
      marketingConsent: true,
      marketingConsentRaw: "true",
    });
    expect(json.answers).toEqual({
      Social: 3,
      Curiosity: 5,
      Execution: 3,
      Connection: 3,
      Beyond_default: 4,
    });
    expect(json.professionalContext).toEqual({
      lookingFor: ["Brands"],
      workplaceType: ["Brand / Company"],
    });
    expect(json.beyondType).toBe("visionary");
    expect(json.primaryProject.id).toBe("delivery-van-redesign");
    expect(json.secondaryProject.id).toBe("bourzma-boutique");
    expect(json.primaryProject.whatWeDid).toBeTruthy();
  });

  it("never logs personal data", async () => {
    vi.stubEnv("TYPEFORM_WEBHOOK_SECRET", SECRET);
    await post(body, sign(body));
    const logged = vi.mocked(console.log).mock.calls.flat().join(" ");
    for (const value of ["Jane", "Example", "jane@example.com", "linkedin.com", "Creative Director"])
      expect(logged).not.toContain(value);
    expect(logged).toContain('"Email":true');
  });

  it("rejects missing or wrong signatures when a secret is set", async () => {
    vi.stubEnv("TYPEFORM_WEBHOOK_SECRET", SECRET);
    expect((await post(body)).status).toBe(401);
    expect((await post(body, sign(body, "wrong"))).status).toBe(401);
    expect((await post(body + " ", sign(body))).status).toBe(401);
  });

  it("refuses to run unsigned in production", async () => {
    vi.stubEnv("TYPEFORM_WEBHOOK_SECRET", "");
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await post(body)).status).toBe(503);
  });

  it("returns 422 when personality answers are missing", async () => {
    vi.stubEnv("TYPEFORM_WEBHOOK_SECRET", SECRET);
    const partial = JSON.stringify({ form_response: { answers: [] } });
    const res = await post(partial, sign(partial));
    expect(res.status).toBe(422);
  });
});
