import { describe, it, expect } from "vitest";
import { msToTimestamp, toTxt, toSrt, toMarkdown, toPdf } from "../formatters";
import type { Utterance } from "@/hooks/useTranscriptionPolling";

describe("msToTimestamp", () => {
  it("formats 0ms as 00:00:00.000", () => {
    expect(msToTimestamp(0)).toBe("00:00:00.000");
  });

  it("formats 23353ms as 00:00:23.353", () => {
    expect(msToTimestamp(23_353)).toBe("00:00:23.353");
  });

  it("formats 3661000ms as 01:01:01.000", () => {
    expect(msToTimestamp(3_661_000)).toBe("01:01:01.000");
  });

  it("formats exactly 1 hour as 01:00:00.000", () => {
    expect(msToTimestamp(3_600_000)).toBe("01:00:00.000");
  });

  it("pads single-digit values with leading zeros", () => {
    expect(msToTimestamp(61_001)).toBe("00:01:01.001");
  });

  it("handles hours > 9", () => {
    expect(msToTimestamp(36_000_000)).toBe("10:00:00.000");
  });

  it("handles milliseconds < 100 with correct padding", () => {
    expect(msToTimestamp(1_007)).toBe("00:00:01.007");
  });
});

describe("toTxt", () => {
  const utterances: Utterance[] = [
    { start: 1000, end: 5000, speaker: "A", text: "Hello" },
    { start: 5500, end: 9000, speaker: "B", text: "World" },
  ];

  it("formats utterances as text with timestamps and speaker names", () => {
    const result = toTxt(utterances, { A: "Paweł", B: "Dave" });
    expect(result).toContain("00:00:01.000 - Paweł");
    expect(result).toContain("Hello");
    expect(result).toContain("00:00:05.500 - Dave");
    expect(result).toContain("World");
  });

  it("uses speaker ID as fallback when name is not in map", () => {
    const result = toTxt(utterances, { A: "Paweł" });
    expect(result).toContain("00:00:01.000 - Paweł");
    expect(result).toContain("00:00:05.500 - B");
  });

  it("separates utterances with double newline", () => {
    const result = toTxt(utterances, {});
    const parts = result.split("\n\n");
    expect(parts).toHaveLength(2);
  });

  it("handles empty utterance array", () => {
    const result = toTxt([], {});
    expect(result).toBe("");
  });
});

describe("toSrt", () => {
  const utterances: Utterance[] = [
    { start: 1000, end: 5000, speaker: "A", text: "Hello" },
    { start: 5500, end: 9000, speaker: "B", text: "World" },
  ];

  it("generates SRT format with numbering and arrow separator", () => {
    const result = toSrt(utterances, {});
    expect(result).toContain("1\n00:00:01,000 --> 00:00:05,000");
    expect(result).toContain("2\n00:00:05,500 --> 00:00:09,000");
  });

  it("uses comma instead of dot in timestamps (SRT standard)", () => {
    const result = toSrt(utterances, {});
    expect(result).toContain("00:00:01,000");
    expect(result).not.toContain("00:00:01.000");
  });

  it("includes speaker name prefix in text", () => {
    const result = toSrt(utterances, { A: "Paweł", B: "Dave" });
    expect(result).toContain("Paweł: Hello");
    expect(result).toContain("Dave: World");
  });

  it("handles empty utterance array", () => {
    const result = toSrt([], {});
    expect(result).toBe("");
  });
});

describe("toMarkdown", () => {
  const utterances: Utterance[] = [
    { start: 1000, end: 5000, speaker: "A", text: "Hello" },
    { start: 5500, end: 9000, speaker: "B", text: "World" },
  ];

  it("generates markdown with H2 headers", () => {
    const result = toMarkdown(utterances, { A: "Paweł", B: "Dave" });
    expect(result).toContain("## 00:00:01.000 - Paweł");
    expect(result).toContain("## 00:00:05.500 - Dave");
  });

  it("includes headers and separates sections with double newline", () => {
    const result = toMarkdown(utterances, {});
    expect(result).toContain("## 00:00:01.000");
    expect(result).toContain("## 00:00:05.500");
    expect(result).toMatch(/Hello\n\n##/);
  });

  it("handles empty utterance array", () => {
    const result = toMarkdown([], {});
    expect(result).toBe("");
  });
});

describe("toPdf", () => {
  const utterances: Utterance[] = [
    { start: 1000, end: 5000, speaker: "A", text: "Hello world" },
  ];

  it("generates PDF as ArrayBuffer", async () => {
    const result = await toPdf(utterances, { A: "Paweł" });
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("generates valid PDF with speaker names", async () => {
    const result = await toPdf(utterances, { A: "Paweł" });
    expect(result.byteLength).toBeGreaterThan(100);
    const uint8 = new Uint8Array(result);
    const text = new TextDecoder().decode(uint8.slice(0, 20));
    expect(text.includes("%PDF")).toBe(true);
  });

  it("throws error for transcript exceeding 5MB estimated size", async () => {
    const largeUtterances: Utterance[] = Array.from({ length: 10000 }, (_, i) => ({
      start: i * 1000,
      end: (i + 1) * 1000,
      speaker: "A",
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(100),
    }));

    await expect(toPdf(largeUtterances, {})).rejects.toThrow(/too large/i);
  });
});

describe("Special character handling", () => {
  it("preserves quotes in speaker names", () => {
    const utterances: Utterance[] = [
      { start: 0, end: 1000, speaker: "A", text: "Hello" },
    ];
    const result = toTxt(utterances, { A: 'O\'Brien' });
    expect(result).toContain('O\'Brien');
  });

  it("preserves unicode characters in speaker names", () => {
    const utterances: Utterance[] = [
      { start: 0, end: 1000, speaker: "A", text: "Hello" },
    ];
    const result = toTxt(utterances, { A: "José García" });
    expect(result).toContain("José García");
  });

  it("preserves newlines in text", () => {
    const utterances: Utterance[] = [
      { start: 0, end: 1000, speaker: "A", text: "Line 1\nLine 2" },
    ];
    const result = toTxt(utterances, {});
    expect(result).toContain("Line 1\nLine 2");
  });

  it("handles markdown special characters in text", () => {
    const utterances: Utterance[] = [
      { start: 0, end: 1000, speaker: "A", text: "## This is bold **text**" },
    ];
    const result = toMarkdown(utterances, {});
    expect(result).toContain("## This is bold **text**");
  });

  it("handles SRT arrow syntax in text", () => {
    const utterances: Utterance[] = [
      { start: 0, end: 1000, speaker: "A", text: "Line 1 --> Line 2" },
    ];
    const result = toSrt(utterances, {});
    expect(result).toContain("Line 1 --> Line 2");
  });

  it("generates PDF with unicode speaker names", async () => {
    const utterances: Utterance[] = [
      { start: 0, end: 1000, speaker: "A", text: "Café" },
    ];
    const result = await toPdf(utterances, { A: "François" });
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });
});
