"use client";

import { useState, useEffect } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import TranscriptionProgress from "@/components/TranscriptionProgress";
import TranscriptionViewer from "@/components/TranscriptionViewer";
import SpeakerNameEditor from "@/components/SpeakerNameEditor";
import DownloadButtons from "@/components/DownloadButtons";
import { useTranscriptionPolling } from "@/hooks/useTranscriptionPolling";
import { toErrorMessage } from "@/lib/errors";

export default function Home() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [email, setEmail] = useState<string>("");
  const [notificationSent, setNotificationSent] = useState(false);

  const transcriptionState = useTranscriptionPolling(transcriptId, blobUrl);

  useEffect(() => {
    if (
      transcriptionState.status === "completed" &&
      email &&
      transcriptId &&
      !notificationSent
    ) {
      setNotificationSent(true);
      const controller = new AbortController();

      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, transcriptId }),
        signal: controller.signal,
      }).catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Failed to send notification:", err);
        }
      });

      return () => {
        controller.abort();
      };
    }
  }, [transcriptionState.status, email, transcriptId, notificationSent]);

  async function handleUploadComplete(url: string) {
    setBlobUrl(url);
    setSubmitError(null);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: url, email: email || null }),
      });
      const data = await response.json() as { transcriptId?: string; error?: string };
      if (!response.ok) {
        setSubmitError(data.error ?? "Nie udało się rozpocząć transkrypcji");
        return;
      }
      if (data.transcriptId) {
        setTranscriptId(data.transcriptId);
      }
    } catch (err) {
      setSubmitError(toErrorMessage(err));
    }
  }

  const isCompleted = transcriptionState.status === "completed";
  const showUpload = transcriptId === null;
  const showProgress = transcriptId !== null && !isCompleted;

  const uniqueSpeakers = isCompleted
    ? [...new Set(transcriptionState.utterances.map((u) => u.speaker))]
    : [];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Video Transcription</h1>
          <p className="text-muted-foreground">
            Transkrypcja nagrań wideo ze spotkań (Google Meets, do 1GB)
          </p>
        </div>

        {showUpload && (
          <>
            <div className="space-y-4">
              <label htmlFor="email" className="block text-sm">
                <span className="font-medium">E-mail (opcjonalnie)</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Otrzymasz powiadomienie e-mail gdy transkrypcja będzie gotowa
                </p>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twój@email.com"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>
            <UploadDropzone onUploadComplete={handleUploadComplete} />
          </>
        )}

        {submitError && (
          <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {submitError}
          </div>
        )}

        {showProgress && (
          <TranscriptionProgress state={transcriptionState} />
        )}

        {isCompleted && (
          <>
            <SpeakerNameEditor
              speakers={uniqueSpeakers}
              names={speakerNames}
              onChange={setSpeakerNames}
            />
            <DownloadButtons
              utterances={transcriptionState.utterances}
              speakerNames={speakerNames}
            />
            <TranscriptionViewer
              utterances={transcriptionState.utterances}
              speakerNames={speakerNames}
              detectedLanguage={transcriptionState.detectedLanguage}
            />
          </>
        )}
      </div>
    </main>
  );
}
