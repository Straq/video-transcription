// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/assemblyai", () => ({
  getTranscript: vi.fn(),
}));

vi.mock("@/lib/blob", () => ({
  deleteBlob: vi.fn(),
  isValidBlobUrl: (url: string): boolean => {
    try {
      const { hostname, protocol } = new URL(url);
      return protocol === "https:" && /\.vercel-storage\.com$/.test(hostname);
    } catch {
      return false;
    }
  },
}));

const BLOB_URL = "https://abc123.public.blob.vercel-storage.com/video.mp4";

function makeRequest(id: string, blobUrl?: string): Request {
  const url = blobUrl
    ? `http://localhost/api/transcribe/${id}?blobUrl=${encodeURIComponent(blobUrl)}`
    : `http://localhost/api/transcribe/${id}`;
  return new Request(url);
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/transcribe/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid transcript ID", async () => {
    const { GET } = await import("../route");
    const response = await GET(makeRequest("../../etc/passwd"), makeParams("../../etc/passwd"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid transcript ID");
  });

  it("returns status queued without calling deleteBlob", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    const { deleteBlob } = await import("@/lib/blob");
    vi.mocked(getTranscript).mockResolvedValueOnce({ id: "t-1", status: "queued" });

    const { GET } = await import("../route");
    const response = await GET(makeRequest("t-1", BLOB_URL), makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("queued");
    expect(deleteBlob).not.toHaveBeenCalled();
  });

  it("returns status processing without calling deleteBlob", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    const { deleteBlob } = await import("@/lib/blob");
    vi.mocked(getTranscript).mockResolvedValueOnce({ id: "t-1", status: "processing" });

    const { GET } = await import("../route");
    const response = await GET(makeRequest("t-1", BLOB_URL), makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("processing");
    expect(deleteBlob).not.toHaveBeenCalled();
  });

  it("returns utterances on completed and calls deleteBlob with valid blobUrl", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    const { deleteBlob } = await import("@/lib/blob");
    vi.mocked(getTranscript).mockResolvedValueOnce({
      id: "t-1",
      status: "completed",
      utterances: [{ start: 0, end: 1000, speaker: "A", text: "Cześć" }],
      detectedLanguage: "pl",
    });

    const { GET } = await import("../route");
    const response = await GET(makeRequest("t-1", BLOB_URL), makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("completed");
    expect(body.utterances).toHaveLength(1);
    expect(body.detectedLanguage).toBe("pl");
    expect(deleteBlob).toHaveBeenCalledWith(BLOB_URL);
  });

  it("calls deleteBlob and returns error message when status is error", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    const { deleteBlob } = await import("@/lib/blob");
    vi.mocked(getTranscript).mockResolvedValueOnce({
      id: "t-1",
      status: "error",
      error: "Audio file corrupted",
    });

    const { GET } = await import("../route");
    const response = await GET(makeRequest("t-1", BLOB_URL), makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.error).toBe("Audio file corrupted");
    expect(deleteBlob).toHaveBeenCalledWith(BLOB_URL);
  });

  it("does NOT call deleteBlob when blobUrl is absent", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    const { deleteBlob } = await import("@/lib/blob");
    vi.mocked(getTranscript).mockResolvedValueOnce({ id: "t-1", status: "completed" });

    const { GET } = await import("../route");
    const response = await GET(makeRequest("t-1"), makeParams("t-1"));

    expect(response.status).toBe(200);
    expect(deleteBlob).not.toHaveBeenCalled();
  });

  it("does NOT call deleteBlob when blobUrl fails host validation", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    const { deleteBlob } = await import("@/lib/blob");
    vi.mocked(getTranscript).mockResolvedValueOnce({ id: "t-1", status: "completed" });

    const { GET } = await import("../route");
    const response = await GET(
      makeRequest("t-1", "https://evil.example.com/steal.mp4"),
      makeParams("t-1")
    );

    expect(response.status).toBe(200);
    expect(deleteBlob).not.toHaveBeenCalled();
  });

  it("still returns 200 when deleteBlob throws (cleanup is best-effort)", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    const { deleteBlob } = await import("@/lib/blob");
    vi.mocked(getTranscript).mockResolvedValueOnce({ id: "t-1", status: "completed" });
    vi.mocked(deleteBlob).mockRejectedValueOnce(new Error("BlobNotFound"));

    const { GET } = await import("../route");
    const response = await GET(makeRequest("t-1", BLOB_URL), makeParams("t-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("completed");
  });

  it("returns 500 when getTranscript throws", async () => {
    const { getTranscript } = await import("@/lib/assemblyai");
    vi.mocked(getTranscript).mockRejectedValueOnce(new Error("Service unavailable"));

    const { GET } = await import("../route");
    const response = await GET(makeRequest("valid-id-123"), makeParams("valid-id-123"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Service unavailable");
  });
});
