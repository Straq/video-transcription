"use client";

import { useState } from "react";
import type { Utterance } from "@/hooks/useTranscriptionPolling";
import { toTxt, toSrt, toMarkdown, toPdf } from "@/lib/formatters";

interface DownloadButtonsProps {
  utterances: Utterance[];
  speakerNames: Record<string, string>;
}

export default function DownloadButtons({ utterances, speakerNames }: DownloadButtonsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  function download(content: string | ArrayBuffer, filename: string, type: string) {
    const parts: BlobPart[] = [content];
    const blob = new Blob(parts, { type });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleDownload(format: "txt" | "srt" | "md" | "pdf") {
    if (!utterances?.length) {
      return;
    }

    setIsLoading(format);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      switch (format) {
        case "txt": {
          const content = toTxt(utterances, speakerNames);
          download(content, `transkrypcja-${timestamp}.txt`, "text/plain");
          break;
        }
        case "srt": {
          const content = toSrt(utterances, speakerNames);
          download(content, `transkrypcja-${timestamp}.srt`, "text/plain");
          break;
        }
        case "md": {
          const content = toMarkdown(utterances, speakerNames);
          download(content, `transkrypcja-${timestamp}.md`, "text/markdown");
          break;
        }
        case "pdf": {
          try {
            const content = await toPdf(utterances, speakerNames);
            download(content, `transkrypcja-${timestamp}.pdf`, "application/pdf");
          } catch (err) {
            console.error("PDF generation failed:", err);
          }
          break;
        }
      }
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <button
        onClick={() => handleDownload("txt")}
        disabled={isLoading !== null}
        className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {isLoading === "txt" ? "…" : "TXT"}
      </button>
      <button
        onClick={() => handleDownload("srt")}
        disabled={isLoading !== null}
        className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {isLoading === "srt" ? "…" : "SRT"}
      </button>
      <button
        onClick={() => handleDownload("md")}
        disabled={isLoading !== null}
        className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {isLoading === "md" ? "…" : "Markdown"}
      </button>
      <button
        onClick={() => handleDownload("pdf")}
        disabled={isLoading !== null}
        className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {isLoading === "pdf" ? "…" : "PDF"}
      </button>
    </div>
  );
}
