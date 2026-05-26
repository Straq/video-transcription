import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TranscriptionViewer from "../TranscriptionViewer";
import type { Utterance } from "@/hooks/useTranscriptionPolling";

afterEach(cleanup);

describe("TranscriptionViewer", () => {
  const utterances: Utterance[] = [
    { start: 1000, end: 5000, speaker: "A", text: "Cześć, jak się masz?" },
    { start: 5500, end: 9000, speaker: "B", text: "Dobrze, dzięki!" },
    { start: 10000, end: 15000, speaker: "A", text: "Fajnie słyszeć." },
  ];

  it("renders utterances list with aria-label", () => {
    render(<TranscriptionViewer utterances={utterances} speakerNames={{}} />);
    expect(screen.getByRole("list", { name: "Transkrypcja" })).toBeInTheDocument();
  });

  it("renders each utterance as list item with timestamp and text", () => {
    render(<TranscriptionViewer utterances={utterances} speakerNames={{}} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(screen.getByText("Cześć, jak się masz?")).toBeInTheDocument();
    expect(screen.getByText("Dobrze, dzięki!")).toBeInTheDocument();
  });

  it("formats timestamps correctly using msToTimestamp", () => {
    render(<TranscriptionViewer utterances={utterances} speakerNames={{}} />);
    expect(screen.getByText("00:00:01.000")).toBeInTheDocument();
    expect(screen.getByText("00:00:05.500")).toBeInTheDocument();
    expect(screen.getByText("00:00:10.000")).toBeInTheDocument();
  });

  it("uses resolved speaker names from map", () => {
    render(
      <TranscriptionViewer
        utterances={utterances}
        speakerNames={{ A: "Paweł", B: "Dave" }}
      />
    );
    expect(screen.getAllByText("Paweł")).toHaveLength(2); // speaker A appears twice
    expect(screen.getByText("Dave")).toBeInTheDocument();
  });

  it("falls back to speaker ID when name is not in map", () => {
    const testUtterances: Utterance[] = [
      { start: 1000, end: 5000, speaker: "A", text: "Hello" },
      { start: 5500, end: 9000, speaker: "B", text: "World" },
    ];
    render(
      <TranscriptionViewer
        utterances={testUtterances}
        speakerNames={{ A: "Paweł" }}
      />
    );
    expect(screen.getByText("Paweł")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument(); // fallback
  });

  it("displays detected language in uppercase", () => {
    render(
      <TranscriptionViewer
        utterances={utterances}
        speakerNames={{}}
        detectedLanguage="pl"
      />
    );
    expect(screen.getByText(/PL/)).toBeInTheDocument();
  });

  it("does not render language info when detectedLanguage is undefined", () => {
    render(<TranscriptionViewer utterances={utterances} speakerNames={{}} />);
    expect(screen.queryByText(/Wykryty język/)).not.toBeInTheDocument();
  });

  it("renders empty list when utterances array is empty", () => {
    render(<TranscriptionViewer utterances={[]} speakerNames={{}} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
