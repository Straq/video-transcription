import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidBlobUrl, deleteBlob } from "../blob";

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

// ── isValidBlobUrl ───────────────────────────────────────────────────────────

describe("isValidBlobUrl", () => {
  it("accepts valid vercel-storage.com HTTPS URL", () => {
    expect(isValidBlobUrl("https://abc123.public.blob.vercel-storage.com/video.mp4")).toBe(true);
  });

  it("rejects HTTP URL", () => {
    expect(isValidBlobUrl("http://abc123.public.blob.vercel-storage.com/video.mp4")).toBe(false);
  });

  it("rejects non-vercel host", () => {
    expect(isValidBlobUrl("https://evil.example.com/video.mp4")).toBe(false);
  });

  it("rejects malformed URL", () => {
    expect(isValidBlobUrl("not-a-url")).toBe(false);
  });
});

// ── deleteBlob ───────────────────────────────────────────────────────────────

describe("deleteBlob", () => {
  const BLOB_URL = "https://abc123.public.blob.vercel-storage.com/video.mp4";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls del with the provided URL", async () => {
    const { del } = await import("@vercel/blob");
    await deleteBlob(BLOB_URL);
    expect(vi.mocked(del)).toHaveBeenCalledWith(BLOB_URL);
  });

  it("propagates errors from del", async () => {
    const { del } = await import("@vercel/blob");
    vi.mocked(del).mockRejectedValueOnce(new Error("BlobNotFound"));
    await expect(deleteBlob(BLOB_URL)).rejects.toThrow("BlobNotFound");
  });
});
