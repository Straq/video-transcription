"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import TranscriptionProgress from "@/components/TranscriptionProgress";
import { useTranscriptionPolling } from "@/hooks/useTranscriptionPolling";
import { toErrorMessage } from "@/lib/errors";

export default function Home() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const transcriptionState = useTranscriptionPolling(transcriptId, blobUrl);

  async function handleUploadComplete(url: string) {
    setBlobUrl(url);
    setSubmitError(null);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: url }),
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

  const showUpload = transcriptId === null;

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
          <UploadDropzone onUploadComplete={handleUploadComplete} />
        )}

        {submitError && (
          <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {submitError}
          </div>
        )}

        {transcriptId && (
          <TranscriptionProgress state={transcriptionState} />
        )}
      </div>
    </main>
  );
}
