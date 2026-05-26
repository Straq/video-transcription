import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { toErrorMessage } from "@/lib/errors";

const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body: body as HandleUploadBody,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["video/*", "audio/*"],
        maximumSizeInBytes: MAX_SIZE_BYTES,
      }),
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 }
    );
  }
}
