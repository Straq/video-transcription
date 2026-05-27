import { describe, it, expect } from "vitest";
import { toErrorMessage } from "../errors";

describe("toErrorMessage", () => {
  it("returns message from Error instance", () => {
    expect(toErrorMessage(new Error("something went wrong"))).toBe("something went wrong");
  });

  it("converts non-Error to string", () => {
    expect(toErrorMessage("raw string error")).toBe("raw string error");
    expect(toErrorMessage(42)).toBe("42");
  });
});
