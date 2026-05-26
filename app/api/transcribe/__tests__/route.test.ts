// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/assemblyai", () => ({
  createTranscript: vi.fn(),
}));

vi.mock("@/lib/blob", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/blob")>();
  return { isValidBlobUrl: actual.isValidBlobUrl };
});

describe("POST /api/transcribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns 200 with transcriptId on success", async () => {
    const { createTranscript } = await import("@/lib/assemblyai");
    vi.mocked(createTranscript).mockResolvedValueOnce("transcript-abc");

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ blobUrl: "https://store.public.blob.vercel-storage.com/v.mp4" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.transcriptId).toBe("transcript-abc");
    expect(createTranscript).toHaveBeenCalledWith({ audioUrl: "https://store.public.blob.vercel-storage.com/v.mp4" });
  });

  it("returns 400 when blobUrl is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when blobUrl is not a valid URL", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ blobUrl: "not-a-url" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when blobUrl uses HTTP instead of HTTPS", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ blobUrl: "http://store.public.blob.vercel-storage.com/v.mp4" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Vercel Blob/);
  });

  it("returns 400 when blobUrl is not a Vercel Blob host", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest({ blobUrl: "https://evil.example.com/video.mp4" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Vercel Blob/);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const { POST } = await import("../route");
    const request = new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: "{ bad json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 500 when createTranscript throws", async () => {
    const { createTranscript } = await import("@/lib/assemblyai");
    vi.mocked(createTranscript).mockRejectedValueOnce(new Error("AssemblyAI error"));

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ blobUrl: "https://store.public.blob.vercel-storage.com/v.mp4" }));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("AssemblyAI error");
  });
});
