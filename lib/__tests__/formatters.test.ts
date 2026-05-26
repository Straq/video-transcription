import { describe, it, expect } from "vitest";
import { msToTimestamp } from "../formatters";

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
