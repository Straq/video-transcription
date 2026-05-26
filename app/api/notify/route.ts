import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTranscriptionReadyEmail } from "@/lib/resend";
import { toErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

const notifySchema = z.object({
  email: z.string().email("Invalid email address"),
  transcriptId: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    await sendTranscriptionReadyEmail({ to: parsed.data.email });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify error:", err);
    return NextResponse.json(
      { error: toErrorMessage(err) },
      { status: 500 }
    );
  }
}
