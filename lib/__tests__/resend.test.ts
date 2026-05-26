import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Resend as ResendType } from "resend";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class {
      emails = { send: mockSend };
    } as never
  ),
}));

const ALL_REQUIRED_ENV = {
  ASSEMBLYAI_API_KEY: "test-assemblyai-key",
  RESEND_API_KEY: "test-resend-key",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_test",
  RESEND_FROM_EMAIL: "noreply@example-domain.com",
};

describe("sendTranscriptionReadyEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, ALL_REQUIRED_ENV);
  });

  afterEach(() => {
    mockSend.mockReset();
    for (const key of Object.keys(ALL_REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it("sends email with correct parameters", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "email-123" }, error: null });

    const { sendTranscriptionReadyEmail } = await import("../resend");
    await sendTranscriptionReadyEmail({
      to: "user@example.com",
      appUrl: "https://video-transcription.vercel.app",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@example-domain.com",
        to: "user@example.com",
        subject: "Twoja transkrypcja jest gotowa",
        html: expect.stringContaining("https://video-transcription.vercel.app"),
      })
    );
  });

  it("throws when Resend returns an error", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid recipient" },
    });

    const { sendTranscriptionReadyEmail } = await import("../resend");
    await expect(
      sendTranscriptionReadyEmail({
        to: "bad@",
        appUrl: "https://video-transcription.vercel.app",
      })
    ).rejects.toThrow("Resend send failed: Invalid recipient");
  });
});
