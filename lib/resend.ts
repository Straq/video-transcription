import "server-only";
// API routes using this module must set: export const runtime = "nodejs"
import { Resend } from "resend";
import { env } from "./env";

function getResendClient(): Resend {
  return new Resend(env.RESEND_API_KEY);
}

export interface SendTranscriptionReadyEmailParams {
  to: string;
  appUrl: string;
}

export async function sendTranscriptionReadyEmail(
  params: SendTranscriptionReadyEmailParams
): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: "Twoja transkrypcja jest gotowa",
    html: `
      <p>Twoja transkrypcja wideo została zakończona.</p>
      <p><a href="${params.appUrl}">Wróć do narzędzia</a>, aby pobrać wynik.</p>
    `,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
