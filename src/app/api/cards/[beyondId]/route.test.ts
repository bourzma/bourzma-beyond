import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const blob = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@vercel/blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/blob")>()),
  ...blob,
}));

const ID = "BYD-ETXQ-97CX";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const request = (id: string, query = "") =>
  GET(new Request(`http://localhost/api/cards/${id}${query}`), {
    params: Promise.resolve({ beyondId: id }),
  });

describe("GET /api/cards/[beyondId]", () => {
  beforeEach(() => {
    blob.get.mockReset().mockResolvedValue({
      statusCode: 200,
      stream: new Blob([PNG]).stream(),
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is disabled without CARD_PREVIEW_KEY", async () => {
    vi.stubEnv("CARD_PREVIEW_KEY", "");
    expect((await request(ID, "?key=anything")).status).toBe(404);
    expect(blob.get).not.toHaveBeenCalled();
  });

  it("requires the right key", async () => {
    vi.stubEnv("CARD_PREVIEW_KEY", "preview-key");
    expect((await request(ID)).status).toBe(401);
    expect((await request(ID, "?key=wrong")).status).toBe(401);
    expect(blob.get).not.toHaveBeenCalled();
  });

  it("rejects malformed IDs", async () => {
    vi.stubEnv("CARD_PREVIEW_KEY", "preview-key");
    expect((await request("../secrets", "?key=preview-key")).status).toBe(400);
  });

  it("serves the stored private PNG, never cached", async () => {
    vi.stubEnv("CARD_PREVIEW_KEY", "preview-key");
    const res = await request(ID, "?key=preview-key");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(blob.get).toHaveBeenCalledWith(`cards/${ID}.png`, { access: "private" });
  });

  it("offers a download", async () => {
    vi.stubEnv("CARD_PREVIEW_KEY", "preview-key");
    const res = await request(ID, "?key=preview-key&download=1");
    expect(res.headers.get("content-disposition")).toBe(`attachment; filename="beyond-card-${ID}.png"`);
  });

  it("returns 404 when no card exists", async () => {
    vi.stubEnv("CARD_PREVIEW_KEY", "preview-key");
    blob.get.mockResolvedValue(null);
    expect((await request(ID, "?key=preview-key")).status).toBe(404);
  });
});
