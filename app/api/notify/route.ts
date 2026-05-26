import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTranscriptionReadyEmail } from "@/lib/resend";
import { toErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

const notifySchema = z.object({
  email: z.string().email("Invalid email address"),
  transcriptId: z.string().regex(/^[a-zA-Z0-9_-]+$/, "Invalid transcript ID format"),
});

// Simple in-memory rate limiting (per-email, per 24 hours)
const emailSendLog = new Map<string, number[]>();
const RATE_LIMIT_PER_EMAIL = 10;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const timestamps = emailSendLog.get(email) || [];
  const recentSends = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recentSends.length >= RATE_LIMIT_PER_EMAIL) {
    return false;
  }

  recentSends.push(now);
  emailSendLog.set(email, recentSends);
  return true;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!checkRateLimit(parsed.data.email)) {
    return NextResponse.json(
      { error: "Too many notification requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    await sendTranscriptionReadyEmail({ to: parsed.data.email });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify error:", err);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
