import { Resend } from "resend";

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

export interface SendTranscriptionReadyEmailParams {
  to: string;
  appUrl: string;
}

export async function sendTranscriptionReadyEmail(
  params: SendTranscriptionReadyEmailParams
): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

  const { error } = await resend.emails.send({
    from,
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
