import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

const ALL_REQUIRED_ENV = {
  ASSEMBLYAI_API_KEY: "test-key",
  RESEND_API_KEY: "test-resend-key",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_test",
  RESEND_FROM_EMAIL: "noreply@example-domain.com",
};

describe("createTranscript", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
    Object.assign(process.env, ALL_REQUIRED_ENV);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of Object.keys(ALL_REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it("sends correct parameters to AssemblyAI", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "transcript-123" }),
    } as Response);

    const { createTranscript } = await import("../assemblyai");
    const id = await createTranscript({
      audioUrl: "https://blob.vercel-storage.com/video.mp4",
    });

    expect(id).toBe("transcript-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.assemblyai.com/v2/transcript",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "test-key",
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining(
          '"audio_url":"https://blob.vercel-storage.com/video.mp4"'
        ),
      })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    expect(body.speaker_labels).toBe(true);
    expect(body.language_detection).toBe(true);
    expect(body.speech_model).toBe("universal");
  });

  it("throws when ASSEMBLYAI_API_KEY is not set", async () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    await expect(import("../assemblyai")).rejects.toThrow("ASSEMBLYAI_API_KEY");
  });

  it("throws on non-ok response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as Response);

    const { createTranscript } = await import("../assemblyai");
    await expect(
      createTranscript({ audioUrl: "https://blob.vercel-storage.com/video.mp4" })
    ).rejects.toThrow("AssemblyAI create transcript failed");
  });

  it("throws on non-https audio URL", async () => {
    const { createTranscript } = await import("../assemblyai");
    await expect(
      createTranscript({ audioUrl: "http://example.com/video.mp4" })
    ).rejects.toThrow("Audio URL must use HTTPS");
  });

  it("throws on completely invalid audio URL", async () => {
    const { createTranscript } = await import("../assemblyai");
    await expect(
      createTranscript({ audioUrl: "not-a-url-at-all" })
    ).rejects.toThrow("Invalid audio URL");
  });
});

describe("getTranscript", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
    Object.assign(process.env, ALL_REQUIRED_ENV);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of Object.keys(ALL_REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it("returns status queued when queued", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "t-1", status: "queued" }),
    } as Response);

    const { getTranscript } = await import("../assemblyai");
    const result = await getTranscript("t-1");

    expect(result.status).toBe("queued");
    expect(result.utterances).toBeUndefined();
  });

  it("returns status processing when not done", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "t-1", status: "processing" }),
    } as Response);

    const { getTranscript } = await import("../assemblyai");
    const result = await getTranscript("t-1");

    expect(result.status).toBe("processing");
    expect(result.utterances).toBeUndefined();
  });

  it("returns status error with error message", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "t-1",
        status: "error",
        error: "Audio file too large",
      }),
    } as Response);

    const { getTranscript } = await import("../assemblyai");
    const result = await getTranscript("t-1");

    expect(result.status).toBe("error");
    expect(result.error).toBe("Audio file too large");
  });

  it("returns utterances when completed", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "t-1",
        status: "completed",
        language_code: "pl",
        utterances: [{ start: 0, end: 1000, speaker: "A", text: "Cześć" }],
      }),
    } as Response);

    const { getTranscript } = await import("../assemblyai");
    const result = await getTranscript("t-1");

    expect(result.status).toBe("completed");
    expect(result.detectedLanguage).toBe("pl");
    expect(result.utterances).toHaveLength(1);
    expect(result.utterances?.at(0)?.speaker).toBe("A");
  });

  it("throws on non-ok response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    } as Response);

    const { getTranscript } = await import("../assemblyai");
    await expect(getTranscript("t-1")).rejects.toThrow(
      "AssemblyAI get transcript failed"
    );
  });

  it("throws on invalid transcript ID", async () => {
    const { getTranscript } = await import("../assemblyai");
    await expect(getTranscript("../../etc/passwd")).rejects.toThrow(
      "Invalid transcript ID format"
    );
  });

  it("throws when API response is missing required fields", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "completed" }), // missing required 'id' field
    } as Response);

    const { getTranscript } = await import("../assemblyai");
    await expect(getTranscript("t-1")).rejects.toThrow();
  });
});

describe("deleteBlob", () => {
  const BLOB_URL = "https://abc123.public.blob.vercel-storage.com/video.mp4";

  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, ALL_REQUIRED_ENV);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of Object.keys(ALL_REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it("calls del with the provided URL", async () => {
    const { deleteBlob } = await import("../assemblyai");
    const { del } = await import("@vercel/blob");
    await deleteBlob(BLOB_URL);
    expect(vi.mocked(del)).toHaveBeenCalledWith(BLOB_URL);
  });

  it("propagates errors from del", async () => {
    const { del } = await import("@vercel/blob");
    vi.mocked(del).mockRejectedValueOnce(new Error("BlobNotFound"));
    const { deleteBlob } = await import("../assemblyai");
    await expect(deleteBlob(BLOB_URL)).rejects.toThrow("BlobNotFound");
  });
});
