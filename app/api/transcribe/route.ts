import { NextResponse } from "next/server";
import { z } from "zod";
import { createTranscript } from "@/lib/assemblyai";
import { isValidBlobUrl } from "@/lib/blob";
import { toErrorMessage } from "@/lib/errors";

const RequestBodySchema = z.object({
  blobUrl: z
    .string()
    .url()
    .refine(isValidBlobUrl, { message: "blobUrl must be a Vercel Blob HTTPS URL" }),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const transcriptId = await createTranscript({ audioUrl: parsed.data.blobUrl });
    return NextResponse.json({ transcriptId });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
