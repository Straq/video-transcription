import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import DownloadButtons from "../DownloadButtons";
import type { Utterance } from "@/hooks/useTranscriptionPolling";

afterEach(cleanup);

const utterances: Utterance[] = [
  { start: 1000, end: 5000, speaker: "A", text: "Hello" },
  { start: 5500, end: 9000, speaker: "B", text: "World" },
];

describe("DownloadButtons", () => {
  it("renders 4 download buttons", () => {
    render(<DownloadButtons utterances={utterances} speakerNames={{}} />);
    expect(screen.getByText("TXT")).toBeInTheDocument();
    expect(screen.getByText("SRT")).toBeInTheDocument();
    expect(screen.getByText("Markdown")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("buttons are all clickable initially", () => {
    const { container } = render(
      <DownloadButtons utterances={utterances} speakerNames={{}} />
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(4);
    buttons.forEach((btn) => {
      expect(btn).not.toBeDisabled();
    });
  });

  it("renders with speaker names in prop", () => {
    render(
      <DownloadButtons
        utterances={utterances}
        speakerNames={{ A: "Paweł", B: "Dave" }}
      />
    );
    expect(screen.getByText("TXT")).toBeInTheDocument();
  });
});
