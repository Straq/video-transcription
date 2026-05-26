"use client";

import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import UploadProgress from "./UploadProgress";
import { toErrorMessage } from "@/lib/errors";

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB
const ACCEPTED_MIME_PREFIXES = ["video/", "audio/"] as const;

interface UploadDropzoneProps {
  onUploadComplete: (url: string) => void;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "completed"; url: string }
  | { status: "error"; message: string };

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Plik jest za duży. Maksymalny rozmiar to 1GB.";
  }
  const isAccepted = ACCEPTED_MIME_PREFIXES.some((prefix) =>
    file.type.startsWith(prefix)
  );
  if (!isAccepted) {
    return "Nieobsługiwany format. Akceptowane są pliki wideo i audio (MP4, MKV, MP3, WAV…).";
  }
  return null;
}

export default function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleFile(file: File): Promise<void> {
    const error = validateFile(file);
    if (error) {
      setState({ status: "error", message: error });
      return;
    }

    abortControllerRef.current = new AbortController();
    setState({ status: "uploading", progress: 0 });
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload-url",
        onUploadProgress: ({ percentage }) => {
          setState({ status: "uploading", progress: percentage });
        },
        abortSignal: abortControllerRef.current.signal,
      });
      setState({ status: "completed", url: blob.url });
      onUploadComplete(blob.url);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState({ status: "error", message: toErrorMessage(err) });
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(): void {
    setIsDragging(false);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  if (state.status === "uploading") {
    return <UploadProgress progress={state.progress} />;
  }

  if (state.status === "completed") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-green-500 bg-green-50 p-12 text-center dark:bg-green-950">
        <p className="text-lg font-semibold text-green-700 dark:text-green-300">
          Upload zakończony
        </p>
        <p className="text-sm text-muted-foreground">
          Plik przekazany do transkrypcji
        </p>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
      }}
      className={[
        "flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
      ].join(" ")}
      role="button"
      tabIndex={0}
      aria-label="Obszar uploadu — przeciągnij plik wideo lub kliknij aby wybrać"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        className="sr-only"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="space-y-2">
        <p className="text-lg font-semibold">Przeciągnij plik wideo tutaj</p>
        <p className="text-sm text-muted-foreground">
          lub kliknij aby wybrać plik
        </p>
        <p className="text-xs text-muted-foreground">
          Obsługiwane formaty: MP4, MKV, MOV, WebM, MP3, WAV — maks. 1GB
        </p>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      )}
    </div>
  );
}
