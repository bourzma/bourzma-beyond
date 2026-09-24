import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const blob = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  ...blob,
}));
const smtp = vi.hoisted(() => ({ sendMail: vi.fn(), createTransport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.createTransport } }));

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
    vi.stubEnv("GMAIL_USER", "bourzma.test@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "abcd efgh ijkl mnop");
    blob.get.mockReset().mockImplementation(async (pathname: string) => {
      if (pathname === `cards/${ID}.json`) return { statusCode: 200, stream: new Blob([JSON.stringify(META)]).stream() };
      if (pathname === `cards/${ID}.png`) return { statusCode: 200, stream: new Blob([PNG]).stream() };
      return null;
    });
    blob.put.mockReset();
    smtp.sendMail.mockReset().mockResolvedValue({ messageId: "<msg-1@gmail.com>" });
    smtp.createTransport.mockReset().mockReturnValue({ sendMail: smtp.sendMail });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is disabled without EMAIL_TEST_KEY", async () => {
    vi.stubEnv("EMAIL_TEST_KEY", "");
    expect((await send({ beyondId: ID, to: TO })).status).toBe(404);
    expect(smtp.sendMail).not.toHaveBeenCalled();
  });

  it("requires the right key", async () => {
    expect((await send({ beyondId: ID, to: TO }, null)).status).toBe(401);
    expect((await send({ beyondId: ID, to: TO }, "wrong")).status).toBe(401);
    expect(smtp.sendMail).not.toHaveBeenCalled();
  });

  it("validates the input", async () => {
    expect((await send("not json")).status).toBe(400);
    expect((await send({ beyondId: "nope", to: TO })).status).toBe(400);
    expect((await send({ beyondId: ID, to: "a@b.com, c@d.com" })).status).toBe(400);
    expect(smtp.sendMail).not.toHaveBeenCalled();
  });

  it("sends the exact stored PNG through Gmail", async () => {
    const res = await send({ beyondId: ID.toLowerCase(), to: TO });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      beyondId: ID,
      messageId: "<msg-1@gmail.com>",
      beyondType: "visionary",
      primaryProjectId: "delivery-van-redesign",
    });

    expect(smtp.createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "bourzma.test@gmail.com", pass: "abcdefghijklmnop" },
    });
    const message = smtp.sendMail.mock.calls[0][0];
    expect(message).toMatchObject({
      from: { name: "BOURZMA", address: "bourzma.test@gmail.com" },
      to: TO,
      subject: "Your Beyond Card — THE VISIONARY",
    });
    expect(message.text).toContain("DELIVERY VAN REDESIGN");
    expect(message.attachments).toHaveLength(1);
    expect(Buffer.compare(message.attachments[0].content, PNG)).toBe(0);
    expect(message.attachments[0]).toMatchObject({ contentType: "image/png", cid: "beyond-card" });
  });

  it("does not mark the card as emailed", async () => {
    await send({ beyondId: ID, to: TO });
    expect(blob.put).not.toHaveBeenCalled();
  });

  it("never logs the recipient address", async () => {
    await send({ beyondId: ID, to: TO });
    smtp.sendMail.mockRejectedValueOnce(Object.assign(new Error(`rejected ${TO}`), { responseCode: 550 }));
    await send({ beyondId: ID, to: TO });
    const logged = [...vi.mocked(console.log).mock.calls, ...vi.mocked(console.error).mock.calls].flat().join(" ");
    expect(logged).not.toContain(TO);
    expect(logged).toContain("msg-1@gmail.com");
  });

  it("explains when the card has no stored data yet", async () => {
    blob.get.mockResolvedValue(null);
    const res = await send({ beyondId: ID, to: TO });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("resend the delivery");
    expect(smtp.sendMail).not.toHaveBeenCalled();
  });

  it("reports Gmail's reason without echoing addresses", async () => {
    smtp.sendMail.mockRejectedValue(
      Object.assign(new Error(`Invalid login for ${TO}`), {
        responseCode: 534,
        response: `534-5.7.9 Application-specific password required for ${TO}. https://support.google.com/mail/?p=InvalidSecondFactor`,
      }),
    );
    const res = await send({ beyondId: ID, to: TO });
    expect(res.status).toBe(502);
    const { error } = await res.json();
    expect(error).toContain("(534)");
    expect(error).toContain("5.7.9 Application-specific password required");
    expect(error).not.toContain(TO);
  });

  it("fails clearly when Gmail is not configured", async () => {
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    const res = await send({ beyondId: ID, to: TO });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("GMAIL_APP_PASSWORD");
  });
});
