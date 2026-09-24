import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({ head: vi.fn(), put: vi.fn(), get: vi.fn(), del: vi.fn() }));
vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  ...blob,
}));

const { blobAuthMode, checkStorage, isCardStorageConfigured, redact } = await import("./store");

describe("blobAuthMode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses OIDC when the private store provides BLOB_STORE_ID", () => {
    vi.stubEnv("BLOB_STORE_ID", "store_abc");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(blobAuthMode()).toBe("oidc");
    expect(isCardStorageConfigured()).toBe(true);
  });

  it("still accepts a classic read-write token", () => {
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_x_y");
    expect(blobAuthMode()).toBe("read-write-token");
  });

  it("is not configured without either", () => {
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(isCardStorageConfigured()).toBe(false);
  });
});

describe("redact", () => {
  it("removes tokens and JWTs", () => {
    const out = redact(
      "denied: vercel_blob_rw_store123_abcDEF oidc eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.sig token=abc123",
    );
    expect(out).not.toMatch(/vercel_blob_rw_store123|eyJhbGci|abc123/);
    expect(out).toContain("[redacted");
  });
});

describe("checkStorage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("BLOB_STORE_ID", "store_abc");
    let stored = "";
    blob.put.mockReset().mockImplementation(async (_p: string, body: string) => {
      stored = body;
      return {};
    });
    blob.head.mockReset().mockResolvedValue({});
    blob.get.mockReset().mockImplementation(async () => ({ statusCode: 200, stream: new Blob([stored]).stream() }));
    blob.del.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does a private put, head, get and delete", async () => {
    const result = await checkStorage();
    expect(result).toEqual({
      ok: true,
      auth: "oidc",
      steps: { "put (private)": "ok", head: "ok", "get (private)": "ok", delete: "ok" },
    });
    expect(blob.put.mock.calls[0][2]).toMatchObject({ access: "private" });
    expect(blob.get.mock.calls[0][1]).toEqual({ access: "private" });
  });

  it("reports the failing step without secrets", async () => {
    blob.put.mockRejectedValue(new Error("No blob credentials found; token=vercel_blob_rw_s_secret"));
    const result = await checkStorage();
    expect(result.ok).toBe(false);
    expect(result.steps["put (private)"]).toMatch(/^failed: /);
    expect(JSON.stringify(result)).not.toContain("vercel_blob_rw_s_secret");
    expect(blob.head).not.toHaveBeenCalled();
  });
});
