import { NextResponse } from "next/server";
import { getTranscript, deleteBlob } from "@/lib/assemblyai";

const VERCEL_BLOB_HOST_RE = /\.vercel-storage\.com$/;

function isValidBlobUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && VERCEL_BLOB_HOST_RE.test(hostname);
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const result = await getTranscript(id);

    if (result.status === "completed" || result.status === "error") {
      const { searchParams } = new URL(request.url);
      const blobUrl = searchParams.get("blobUrl");
      if (blobUrl && isValidBlobUrl(blobUrl)) {
        try {
          await deleteBlob(blobUrl);
        } catch {
          // Cleanup is best-effort — a missing/already-deleted blob must not fail the response
        }
      }
    }

    return NextResponse.json({
      status: result.status,
      utterances: result.utterances,
      detectedLanguage: result.detectedLanguage,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
