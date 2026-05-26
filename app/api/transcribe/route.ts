import { NextResponse } from "next/server";
import { z } from "zod";
import { createTranscript } from "@/lib/assemblyai";

const RequestBodySchema = z.object({
  blobUrl: z.string().url(),
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
    return NextResponse.json({ error: "blobUrl must be a valid URL" }, { status: 400 });
  }

  try {
    const transcriptId = await createTranscript({ audioUrl: parsed.data.blobUrl });
    return NextResponse.json({ transcriptId });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
