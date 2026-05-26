"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";

export default function Home() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Video Transcription</h1>
          <p className="text-muted-foreground">
            Transkrypcja nagrań wideo ze spotkań (Google Meets, do 1GB)
          </p>
        </div>

        <UploadDropzone onUploadComplete={(url) => setBlobUrl(url)} />

        {blobUrl && (
          <p className="text-xs text-muted-foreground text-center break-all">
            Blob URL: {blobUrl}
          </p>
        )}
      </div>
    </main>
  );
}
