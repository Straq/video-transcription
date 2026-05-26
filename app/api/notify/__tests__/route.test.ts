// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/resend", () => ({
  sendTranscriptionReadyEmail: vi.fn(),
}));

describe("POST /api/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function makeRequest(body: unknown): Promise<Response> {
    const { POST } = await import("../route");
    return POST(
      new Request("http://localhost/api/notify", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  it("returns 200 on success", async () => {
    const { sendTranscriptionReadyEmail } = await import("@/lib/resend");
    vi.mocked(sendTranscriptionReadyEmail).mockResolvedValueOnce(undefined);

    const response = await makeRequest({
      email: "user@example.com",
      transcriptId: "t-123",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when email is missing", async () => {
    const response = await makeRequest({ transcriptId: "t-123" });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when email is invalid", async () => {
    const response = await makeRequest({
      email: "not-an-email",
      transcriptId: "t-123",
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/email/i);
  });

  it("returns 400 when transcriptId is missing", async () => {
    const response = await makeRequest({ email: "user@example.com" });
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/notify", {
        method: "POST",
        body: "{ bad json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/JSON/);
  });

  it("returns 500 when sendTranscriptionReadyEmail throws", async () => {
    const { sendTranscriptionReadyEmail } = await import("@/lib/resend");
    vi.mocked(sendTranscriptionReadyEmail).mockRejectedValueOnce(
      new Error("Email service down")
    );

    const response = await makeRequest({
      email: "user@example.com",
      transcriptId: "t-123",
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/Email service down/);
  });
});
