"use client";
import { useState, useEffect } from "react";

export interface Utterance {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export type TranscriptionState =
  | { status: "idle" }
  | { status: "queued" }
  | { status: "processing" }
  | { status: "completed"; utterances: Utterance[]; detectedLanguage?: string }
  | { status: "error"; message: string }
  | { status: "timeout" };

const FAST_INTERVAL_MS = 5_000;
const SLOW_INTERVAL_MS = 15_000;
const FAST_PHASE_MS = 2 * 60_000;
const MAX_DURATION_MS = 20 * 60_000;

export function useTranscriptionPolling(
  transcriptId: string | null,
  blobUrl: string | null
): TranscriptionState {
  const [state, setState] = useState<TranscriptionState>({ status: "idle" });

  useEffect(() => {
    if (!transcriptId) {
      setState({ status: "idle" });
      return;
    }

    const startTime = Date.now();
    const abortController = new AbortController();
    let timerId: ReturnType<typeof setTimeout> | undefined;

    setState({ status: "queued" });

    async function poll(): Promise<void> {
      const elapsed = Date.now() - startTime;
      if (elapsed >= MAX_DURATION_MS) {
        setState({ status: "timeout" });
        return;
      }

      try {
        const url = blobUrl
          ? `/api/transcribe/${transcriptId}?blobUrl=${encodeURIComponent(blobUrl)}`
          : `/api/transcribe/${transcriptId}`;

        const response = await fetch(url, { signal: abortController.signal });

        if (!response.ok) {
          setState({ status: "error", message: `Błąd serwera: ${response.status}` });
          return;
        }

        const data = await response.json() as { status: string; utterances?: Utterance[]; detectedLanguage?: string; error?: string };

        if (data.status === "completed") {
          setState({
            status: "completed",
            utterances: data.utterances ?? [],
            detectedLanguage: data.detectedLanguage,
          });
          return;
        }

        if (data.status === "error") {
          setState({
            status: "error",
            message: data.error ?? "Transkrypcja nie powiodła się",
          });
          return;
        }

        if (data.status === "processing") {
          setState({ status: "processing" });
        }
        // "queued" status: state already set by effect mount — no update needed

        const nextElapsed = Date.now() - startTime;
        const delay = nextElapsed < FAST_PHASE_MS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
        timerId = setTimeout(poll, delay);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // Network error — retry, do not enter terminal error state
        const nextElapsed = Date.now() - startTime;
        if (nextElapsed < MAX_DURATION_MS) {
          const delay = nextElapsed < FAST_PHASE_MS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
          timerId = setTimeout(poll, delay);
        } else {
          setState({ status: "timeout" });
        }
      }
    }

    timerId = setTimeout(poll, FAST_INTERVAL_MS);

    return () => {
      clearTimeout(timerId);
      abortController.abort();
    };
  }, [transcriptId, blobUrl]);

  return state;
}
