import "server-only";
// API routes using this module must set: export const runtime = "nodejs"
import { Resend } from "resend";
import { env } from "./env";

// Singleton pattern to avoid creating new Resend client on every call
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendTranscriptionReadyEmailParams {
  to: string;
}

export async function sendTranscriptionReadyEmail(
  params: SendTranscriptionReadyEmailParams
): Promise<void> {
  // Email validation is done at API boundary by POST /api/notify
  // This function assumes input is already validated
  const appUrl = new URL(env.APP_URL).toString(); // Validates URL structure

  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: "Twoja transkrypcja jest gotowa",
    html: `
      <p>Twoja transkrypcja wideo została zakończona.</p>
      <p><a href="${appUrl}">Wróć do narzędzia</a>, aby pobrać wynik.</p>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error("Failed to send email notification");
  }
}
