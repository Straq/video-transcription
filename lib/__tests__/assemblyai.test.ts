import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Utterance, TranscriptStatus, TranscriptResult } from "../assemblyai";

describe("AssemblyAI types", () => {
  it("Utterance has required fields", () => {
    const utterance: Utterance = {
      start: 0,
      end: 1000,
      speaker: "A",
      text: "Hello",
    };
    expect(utterance.start).toBe(0);
    expect(utterance.end).toBe(1000);
    expect(utterance.speaker).toBe("A");
    expect(utterance.text).toBe("Hello");
  });

  it("TranscriptStatus covers all states", () => {
    const statuses: TranscriptStatus[] = [
      "queued",
      "processing",
      "completed",
      "error",
    ];
    expect(statuses).toHaveLength(4);
  });

  it("TranscriptResult has required and optional fields", () => {
    const result: TranscriptResult = {
      id: "abc123",
      status: "completed",
      utterances: [{ start: 0, end: 500, speaker: "A", text: "Hi" }],
      detectedLanguage: "pl",
    };
    expect(result.id).toBe("abc123");
    expect(result.status).toBe("completed");
    expect(result.utterances).toHaveLength(1);
    expect(result.detectedLanguage).toBe("pl");
  });
});

describe("createTranscript", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.ASSEMBLYAI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ASSEMBLYAI_API_KEY;
  });

  it("sends correct parameters to AssemblyAI", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "transcript-123" }),
    } as Response);

    const { createTranscript } = await import("../assemblyai");
    const id = await createTranscript({ audioUrl: "https://blob.vercel.com/video.mp4" });

    expect(id).toBe("transcript-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.assemblyai.com/v2/transcript",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "test-key",
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining('"audio_url":"https://blob.vercel.com/video.mp4"'),
      })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    expect(body.speaker_labels).toBe(true);
    expect(body.language_detection).toBe(true);
  });

  it("throws when ASSEMBLYAI_API_KEY is not set", async () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    const { createTranscript } = await import("../assemblyai");
    await expect(
      createTranscript({ audioUrl: "https://blob.vercel.com/video.mp4" })
    ).rejects.toThrow("ASSEMBLYAI_API_KEY is not set");
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
      createTranscript({ audioUrl: "https://blob.vercel.com/video.mp4" })
    ).rejects.toThrow("AssemblyAI create transcript failed: 401 Unauthorized");
  });
});

describe("getTranscript", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.ASSEMBLYAI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ASSEMBLYAI_API_KEY;
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
    expect(result.utterances![0].speaker).toBe("A");
  });
});
