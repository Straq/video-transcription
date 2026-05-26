import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TranscriptionProgress from "../TranscriptionProgress";

afterEach(cleanup);
import type { TranscriptionState } from "@/hooks/useTranscriptionPolling";

describe("TranscriptionProgress", () => {
  it("renders nothing when state is idle", () => {
    const { container } = render(
      <TranscriptionProgress state={{ status: "idle" }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders queued state with 10% progress", () => {
    render(<TranscriptionProgress state={{ status: "queued" }} />);
    expect(screen.getByText(/kolejce/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");
  });

  it("renders processing state with 50% progress", () => {
    render(<TranscriptionProgress state={{ status: "processing" }} />);
    expect(screen.getByText(/transkrypcja/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("renders completed state with 100% progress", () => {
    const utterances = [{ start: 0, end: 1000, speaker: "A", text: "Cześć" }];
    render(
      <TranscriptionProgress
        state={{ status: "completed", utterances, detectedLanguage: "pl" }}
      />
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText(/zakończona/i)).toBeInTheDocument();
  });

  it("renders error state with alert role and message", () => {
    const state: TranscriptionState = { status: "error", message: "Audio plik uszkodzony" };
    render(<TranscriptionProgress state={state} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Audio plik uszkodzony");
  });

  it("renders timeout state with timeout message", () => {
    render(<TranscriptionProgress state={{ status: "timeout" }} />);
    expect(screen.getByText(/zbyt długo/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
