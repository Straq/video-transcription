import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: function MockResend() {
    return { emails: { send: mockSend } };
  },
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
    await sendTranscriptionReadyEmail({ to: "user@example.com" });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@example-domain.com",
        to: "user@example.com",
        subject: "Twoja transkrypcja jest gotowa",
        html: expect.stringContaining("http://localhost:3000"),
      })
    );
  });

  it("throws when Resend returns an error", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Delivery failed" },
    });

    const { sendTranscriptionReadyEmail } = await import("../resend");
    await expect(
      sendTranscriptionReadyEmail({ to: "user@example.com" })
    ).rejects.toThrow("Resend send failed: Delivery failed");
  });

  it("throws when recipient email is invalid", async () => {
    const { sendTranscriptionReadyEmail } = await import("../resend");
    await expect(
      sendTranscriptionReadyEmail({ to: "not-an-email" })
    ).rejects.toThrow("Invalid recipient email address");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("throws when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(import("../resend")).rejects.toThrow("RESEND_API_KEY");
  });
});
