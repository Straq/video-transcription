"use client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTranscriptionPolling } from "../useTranscriptionPolling";

const BLOB_URL = "https://abc123.public.blob.vercel-storage.com/video.mp4";

function mockFetch(response: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useTranscriptionPolling", () => {
  it("returns idle when transcriptId is null", () => {
    const { result } = renderHook(() => useTranscriptionPolling(null, null));
    expect(result.current.status).toBe("idle");
  });

  it("transitions to queued immediately when transcriptId is provided", () => {
    global.fetch = mockFetch({ status: "queued" });
    const { result } = renderHook(() => useTranscriptionPolling("t-1", null));
    expect(result.current.status).toBe("queued");
  });

  it("transitions idle → queued → processing on first poll", async () => {
    global.fetch = mockFetch({ status: "processing" });
    const { result } = renderHook(() => useTranscriptionPolling("t-1", null));

    expect(result.current.status).toBe("queued");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(result.current.status).toBe("processing");
  });

  it("transitions to completed with utterances", async () => {
    global.fetch = mockFetch({
      status: "completed",
      utterances: [{ start: 0, end: 1000, speaker: "A", text: "Cześć" }],
      detectedLanguage: "pl",
    });

    const { result } = renderHook(() => useTranscriptionPolling("t-1", BLOB_URL));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(result.current.status).toBe("completed");
    if (result.current.status === "completed") {
      expect(result.current.utterances).toHaveLength(1);
      expect(result.current.utterances[0].speaker).toBe("A");
      expect(result.current.detectedLanguage).toBe("pl");
    }
  });

  it("transitions to error when API returns error status", async () => {
    global.fetch = mockFetch({ status: "error", error: "Audio corrupted" });

    const { result } = renderHook(() => useTranscriptionPolling("t-1", null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(result.current.status).toBe("error");
    if (result.current.status === "error") {
      expect(result.current.message).toBe("Audio corrupted");
    }
  });

  it("transitions to error on non-ok HTTP response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useTranscriptionPolling("t-1", null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(result.current.status).toBe("error");
    if (result.current.status === "error") {
      expect(result.current.message).toMatch(/500/);
    }
  });

  it("retries on network error without entering terminal error state", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error("Network error"));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: "processing" }),
      });
    });

    const { result } = renderHook(() => useTranscriptionPolling("t-1", null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    // After first poll (network error), state should not be error
    expect(result.current.status).toBe("queued");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current.status).toBe("processing");
  });

  it("includes blobUrl as query param in fetch URL", async () => {
    global.fetch = mockFetch({ status: "queued" });

    renderHook(() => useTranscriptionPolling("t-1", BLOB_URL));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`blobUrl=${encodeURIComponent(BLOB_URL)}`),
      expect.any(Object)
    );
  });

  it("stops polling and returns idle when transcriptId becomes null", async () => {
    global.fetch = mockFetch({ status: "processing" });

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useTranscriptionPolling(id, null),
      { initialProps: { id: "t-1" as string | null } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current.status).toBe("processing");

    rerender({ id: null });
    expect(result.current.status).toBe("idle");
  });

  it("transitions to timeout after 20 minutes", async () => {
    // Returns "processing" for every poll — ~96+ polls over 20 min
    global.fetch = mockFetch({ status: "processing" });

    const { result } = renderHook(() => useTranscriptionPolling("t-1", null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 60_000 + 5_000);
    });

    expect(result.current.status).toBe("timeout");
  });

  it("switches to slow polling after 2 minutes", async () => {
    global.fetch = mockFetch({ status: "processing" });

    renderHook(() => useTranscriptionPolling("t-1", null));

    // Advance past the fast phase (2 min) + one extra slow interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000 + 15_000);
    });

    // Fast phase: 24 polls (2min / 5s), slow: 1 poll after 15s — total 25
    const callCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    // 2 min = 120s / 5s = 24 fast polls; +1 slow poll after 15s = 25 total
    expect(callCount).toBe(25);
  });

  it("aborts fetch when hook unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    global.fetch = vi.fn().mockImplementation((_url: string, options: { signal?: AbortSignal }) => {
      capturedSignal = options.signal;
      return new Promise(() => {}); // never resolves
    });

    const { unmount } = renderHook(() => useTranscriptionPolling("t-1", null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
