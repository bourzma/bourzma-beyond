import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const blob = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  ...blob,
}));
const resend = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
  },
}));

const ID = "BYD-ETXQ-97CX";
const TO = "tester@example.com";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const META = {
  version: 1,
  beyondId: ID,
  beyondType: "visionary",
  primaryProjectId: "delivery-van-redesign",
  secondaryProjectId: "bourzma-boutique",
  createdAt: "2026-09-24T12:00:00.000Z",
};

const send = (body: unknown, key: string | null = "email-key") =>
  POST(
    new Request("http://localhost/api/email/test", {
      method: "POST",
      headers: key ? { "x-email-test-key": key } : {},
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/email/test", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("EMAIL_TEST_KEY", "email-key");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "BOURZMA <onboarding@resend.dev>");
    blob.get.mockReset().mockImplementation(async (pathname: string) => {
      if (pathname === `cards/${ID}.json`) return { statusCode: 200, stream: new Blob([JSON.stringify(META)]).stream() };
      if (pathname === `cards/${ID}.png`) return { statusCode: 200, stream: new Blob([PNG]).stream() };
      return null;
    });
    resend.send.mockReset().mockResolvedValue({ data: { id: "email_123" }, error: null });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is disabled without EMAIL_TEST_KEY", async () => {
    vi.stubEnv("EMAIL_TEST_KEY", "");
    expect((await send({ beyondId: ID, to: TO })).status).toBe(404);
    expect(resend.send).not.toHaveBeenCalled();
  });

  it("requires the right key", async () => {
    expect((await send({ beyondId: ID, to: TO }, null)).status).toBe(401);
    expect((await send({ beyondId: ID, to: TO }, "wrong")).status).toBe(401);
    expect(resend.send).not.toHaveBeenCalled();
  });

  it("validates the input", async () => {
    expect((await send("not json")).status).toBe(400);
    expect((await send({ beyondId: "nope", to: TO })).status).toBe(400);
    expect((await send({ beyondId: ID, to: "a@b.com, c@d.com" })).status).toBe(400);
    expect(resend.send).not.toHaveBeenCalled();
  });

  it("sends the exact stored PNG with the stored type and project", async () => {
    const res = await send({ beyondId: ID.toLowerCase(), to: TO });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      beyondId: ID,
      emailId: "email_123",
      beyondType: "visionary",
      primaryProjectId: "delivery-van-redesign",
    });

    const message = resend.send.mock.calls[0][0];
    expect(message).toMatchObject({
      from: "BOURZMA <onboarding@resend.dev>",
      to: TO,
      subject: "Your Beyond Card — THE VISIONARY",
    });
    expect(message.text).toContain("DELIVERY VAN REDESIGN");
    expect(message.attachments).toHaveLength(1);
    expect(Buffer.compare(message.attachments[0].content, PNG)).toBe(0);
    expect(message.attachments[0]).toMatchObject({ contentType: "image/png", contentId: "beyond-card" });
  });

  it("never logs the recipient address", async () => {
    await send({ beyondId: ID, to: TO });
    resend.send.mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: `not allowed: ${TO}` } });
    await send({ beyondId: ID, to: TO });
    const logged = [...vi.mocked(console.log).mock.calls, ...vi.mocked(console.error).mock.calls].flat().join(" ");
    expect(logged).not.toContain(TO);
    expect(logged).toContain("email_123");
  });

  it("explains when the card has no stored data yet", async () => {
    blob.get.mockResolvedValue(null);
    const res = await send({ beyondId: ID, to: TO });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("resend the delivery");
    expect(resend.send).not.toHaveBeenCalled();
  });

  it("reports a Resend rejection", async () => {
    resend.send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "Only own address" } });
    const res = await send({ beyondId: ID, to: TO });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("Only own address");
  });

  it("fails clearly when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await send({ beyondId: ID, to: TO })).status).toBe(500);
  });
});
