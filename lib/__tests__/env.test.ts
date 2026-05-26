import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const REQUIRED_VARS = {
  ASSEMBLYAI_API_KEY: "test-assemblyai-key",
  RESEND_API_KEY: "test-resend-key",
  BLOB_READ_WRITE_TOKEN: "vercel_blob_test",
  RESEND_FROM_EMAIL: "noreply@example-domain.com",
};

describe("env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, REQUIRED_VARS);
  });

  afterEach(() => {
    vi.resetModules();
    for (const key of Object.keys(REQUIRED_VARS)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("loads successfully when all required vars are present", async () => {
    const { env } = await import("../env");
    expect(env.ASSEMBLYAI_API_KEY).toBe("test-assemblyai-key");
    expect(env.RESEND_API_KEY).toBe("test-resend-key");
    expect(env.BLOB_READ_WRITE_TOKEN).toBe("vercel_blob_test");
    expect(env.RESEND_FROM_EMAIL).toBe("noreply@example-domain.com");
  });

  it("uses default APP_URL when not set", async () => {
    const { env } = await import("../env");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("throws when ASSEMBLYAI_API_KEY is missing", async () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    await expect(import("../env")).rejects.toThrow("ASSEMBLYAI_API_KEY");
  });

  it("throws when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(import("../env")).rejects.toThrow("RESEND_API_KEY");
  });

  it("throws when BLOB_READ_WRITE_TOKEN is missing", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(import("../env")).rejects.toThrow("BLOB_READ_WRITE_TOKEN");
  });

  it("throws when RESEND_FROM_EMAIL is missing", async () => {
    delete process.env.RESEND_FROM_EMAIL;
    await expect(import("../env")).rejects.toThrow("RESEND_FROM_EMAIL");
  });

  it("throws when RESEND_FROM_EMAIL is not a valid email", async () => {
    process.env.RESEND_FROM_EMAIL = "not-an-email";
    await expect(import("../env")).rejects.toThrow("Missing or invalid environment variables");
  });
});
