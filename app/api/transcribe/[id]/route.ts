import { NextResponse } from "next/server";
import { getTranscript } from "@/lib/assemblyai";
import { deleteBlob, isValidBlobUrl } from "@/lib/blob";
import { toErrorMessage } from "@/lib/errors";

const TRANSCRIPT_ID_RE = /^[a-zA-Z0-9_-]+$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (!TRANSCRIPT_ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid transcript ID" }, { status: 400 });
  }

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
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
