import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import submission from "@/lib/beyond/fixtures/typeform-submission.json";
import { beyondIdFor } from "@/lib/card/beyond-id";
import { POST } from "./route";

const blob = vi.hoisted(() => ({ head: vi.fn(), put: vi.fn(), get: vi.fn() }));
vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  ...blob,
}));
const { BlobNotFoundError } = await vi.importActual<typeof import("@vercel/blob")>("@vercel/blob");
const resend = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
  },
}));

const BEYOND_ID = beyondIdFor("test-response-token");

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
    blob.head.mockReset().mockRejectedValue(new BlobNotFoundError());
    blob.put.mockReset().mockResolvedValue({ pathname: `cards/${BEYOND_ID}.png` });
    blob.get.mockReset();
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

  describe("Beyond Card", () => {
    const signed = async (raw = body) => {
      const res = await post(raw, sign(raw));
      return { status: res.status, json: await res.json() };
    };
    const withAnswers = (edit: (answers: typeof submission.form_response.answers) => unknown[]) =>
      JSON.stringify({
        ...submission,
        form_response: { ...submission.form_response, answers: edit(submission.form_response.answers) },
      });

    beforeEach(() => {
      vi.stubEnv("TYPEFORM_WEBHOOK_SECRET", SECRET);
      // Private store with OIDC auth: only BLOB_STORE_ID, no read-write token.
      vi.stubEnv("BLOB_STORE_ID", "store_test");
      vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    });

    it("generates and stores the card for a new submission", async () => {
      const { status, json } = await signed();
      expect(status).toBe(200);
      expect(json.card).toMatchObject({
        beyondId: BEYOND_ID,
        status: "generated",
        stored: true,
        width: 2160,
        height: 1400,
      });
      expect(blob.put).toHaveBeenCalledTimes(2);
      const [pathname, png, options] = blob.put.mock.calls[0];
      expect(pathname).toBe(`cards/${BEYOND_ID}.png`);
      expect(Buffer.from(png).subarray(1, 4).toString()).toBe("PNG");
      expect(options).toMatchObject({ access: "private", contentType: "image/png", addRandomSuffix: false });

      // Card data for the email step: type and projects, no personal data.
      const [metaPath, metaBody, metaOptions] = blob.put.mock.calls[1];
      expect(metaPath).toBe(`cards/${BEYOND_ID}.json`);
      expect(metaOptions).toMatchObject({ access: "private" });
      expect(JSON.parse(metaBody)).toMatchObject({
        beyondId: BEYOND_ID,
        beyondType: "visionary",
        primaryProjectId: "delivery-van-redesign",
        secondaryProjectId: "bourzma-boutique",
      });
      for (const personal of ["Jane", "Example", "jane@example.com"]) expect(metaBody).not.toContain(personal);
    });

    it("does not generate a second card when Typeform retries", async () => {
      blob.head.mockResolvedValue({ pathname: "exists" });
      const { status, json } = await signed();
      expect(status).toBe(200);
      expect(json.card).toEqual({ beyondId: BEYOND_ID, status: "already-generated", stored: true });
      expect(blob.put).not.toHaveBeenCalled();
    });

    it("adds the card data to a card stored before it existed, on retry", async () => {
      blob.head.mockImplementation(async (pathname: string) => {
        if (pathname.endsWith(".png")) return { pathname };
        throw new BlobNotFoundError();
      });
      const { json } = await signed();
      expect(json.card.status).toBe("already-generated");
      expect(blob.put).toHaveBeenCalledTimes(1);
      expect(blob.put.mock.calls[0][0]).toBe(`cards/${BEYOND_ID}.json`);
    });

    it("never sends email (automatic emails are off)", async () => {
      await signed();
      expect(resend.send).not.toHaveBeenCalled();
    });

    it("gives the same Beyond ID for the same response token", async () => {
      const first = await signed();
      const second = await signed();
      expect(first.json.card.beyondId).toBe(second.json.card.beyondId);
    });

    it("renders without a company or last name", async () => {
      const raw = withAnswers((a) => a.filter((x) => !["Company", "Last_name"].includes(x.field.ref)));
      const { status, json } = await signed(raw);
      expect(status).toBe(200);
      expect(json.contact.company).toBeNull();
      expect(json.card.status).toBe("generated");
    });

    it("still generates the card when no Blob store is connected", async () => {
      vi.stubEnv("BLOB_STORE_ID", "");
      const { status, json } = await signed();
      expect(status).toBe(200);
      expect(json.card).toMatchObject({ beyondId: BEYOND_ID, status: "generated-not-stored", stored: false });
      expect(blob.put).not.toHaveBeenCalled();
    });

    it("returns 500 so Typeform retries when storage fails, logging no secrets", async () => {
      blob.put.mockRejectedValue(new Error("Access denied for token vercel_blob_rw_abc123_SECRET"));
      const { status } = await signed();
      expect(status).toBe(500);
      const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
      expect(logged).toContain("[blob] storage failure");
      expect(logged).toContain('"stage":"save"');
      expect(logged).toContain('"auth":"oidc"');
      expect(logged).not.toContain("vercel_blob_rw_abc123_SECRET");
      for (const personal of ["Jane", "jane@example.com", "Example Studio"]) expect(logged).not.toContain(personal);
    });

    it("rejects submissions without a response token", async () => {
      const raw = JSON.stringify({ ...submission, form_response: { ...submission.form_response, token: undefined } });
      expect((await signed(raw)).status).toBe(422);
      expect(blob.put).not.toHaveBeenCalled();
    });
  });

  it("returns 422 when personality answers are missing", async () => {
    vi.stubEnv("TYPEFORM_WEBHOOK_SECRET", SECRET);
    const partial = JSON.stringify({ form_response: { answers: [] } });
    const res = await post(partial, sign(partial));
    expect(res.status).toBe(422);
  });
});
