import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { upload } from "@vercel/blob/client";
import UploadDropzone, { validateFile } from "../UploadDropzone";
import type { PutBlobResult, UploadProgressEvent } from "@vercel/blob";

vi.mock("@vercel/blob/client", () => ({
  upload: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const MAX_SIZE = 1024 * 1024 * 1024; // 1GB

function makeFile(name: string, type: string, size: number = 1024): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function getFileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

// ── Pure validation ──────────────────────────────────────────────────────────

describe("validateFile", () => {
  it("accepts a valid video file within size limit", () => {
    expect(validateFile(makeFile("meeting.mp4", "video/mp4", 500 * 1024 * 1024))).toBeNull();
  });

  it("accepts a valid audio file", () => {
    expect(validateFile(makeFile("recording.mp3", "audio/mpeg"))).toBeNull();
  });

  it("rejects file larger than 1GB", () => {
    expect(validateFile(makeFile("huge.mp4", "video/mp4", MAX_SIZE + 1))).toMatch(/za duży/);
  });

  it("rejects non-video non-audio file", () => {
    expect(validateFile(makeFile("doc.pdf", "application/pdf"))).toMatch(/Nieobsługiwany/);
  });

  it("accepts file exactly at the 1GB boundary", () => {
    expect(validateFile(makeFile("edge.mp4", "video/mp4", MAX_SIZE))).toBeNull();
  });
});

// ── Component ────────────────────────────────────────────────────────────────

describe("UploadDropzone", () => {
  it("renders idle state with upload prompt", () => {
    render(<UploadDropzone onUploadComplete={vi.fn()} />);
    expect(screen.getByText(/Przeciągnij plik wideo/)).toBeInTheDocument();
  });

  it("shows error when file exceeds 1GB — upload is NOT called", async () => {
    render(<UploadDropzone onUploadComplete={vi.fn()} />);

    await act(async () => {
      fireEvent.change(getFileInput(), {
        target: { files: [makeFile("big.mp4", "video/mp4", MAX_SIZE + 1)] },
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/za duży/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("shows error for non-video file — upload is NOT called", async () => {
    render(<UploadDropzone onUploadComplete={vi.fn()} />);

    await act(async () => {
      fireEvent.change(getFileInput(), {
        target: { files: [makeFile("report.pdf", "application/pdf")] },
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/Nieobsługiwany/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("progress callback updates the progress bar, then calls onUploadComplete", async () => {
    const onUploadComplete = vi.fn();
    let resolveUpload!: (value: PutBlobResult) => void;
    let capturedProgress: ((e: UploadProgressEvent) => void) | undefined;

    vi.mocked(upload).mockImplementationOnce(async (_name, _body, options) => {
      capturedProgress = options.onUploadProgress;
      return new Promise<PutBlobResult>((resolve) => {
        resolveUpload = resolve;
      });
    });

    render(<UploadDropzone onUploadComplete={onUploadComplete} />);

    // Trigger upload — handleFile sets state to uploading before awaiting upload()
    await act(async () => {
      fireEvent.change(getFileInput(), {
        target: { files: [makeFile("meeting.mp4", "video/mp4")] },
      });
    });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // Simulate progress update from @vercel/blob/client
    act(() => {
      capturedProgress?.({ loaded: 60, total: 100, percentage: 60 });
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");

    // Resolve the upload — component transitions to completed
    await act(async () => {
      resolveUpload({
        url: "https://blob.vercel.com/meeting.mp4",
        pathname: "meeting.mp4",
        contentType: "video/mp4",
        contentDisposition: "inline",
        downloadUrl: "https://blob.vercel.com/meeting.mp4?download=1",
        etag: "abc123",
      });
    });

    expect(onUploadComplete).toHaveBeenCalledWith("https://blob.vercel.com/meeting.mp4");
    expect(screen.getByText(/Upload zakończony/)).toBeInTheDocument();
  });

  it("shows error message when upload throws", async () => {
    vi.mocked(upload).mockRejectedValueOnce(new Error("Upload limit exceeded"));

    render(<UploadDropzone onUploadComplete={vi.fn()} />);

    await act(async () => {
      fireEvent.change(getFileInput(), {
        target: { files: [makeFile("meeting.mp4", "video/mp4")] },
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Upload limit exceeded");
  });

  it("transitions to uploading state on drag-and-drop of valid file", async () => {
    vi.mocked(upload).mockImplementationOnce(
      () => new Promise<PutBlobResult>(() => {})
    );

    const { getByRole } = render(<UploadDropzone onUploadComplete={vi.fn()} />);

    await act(async () => {
      fireEvent.drop(getByRole("button"), {
        dataTransfer: { files: [makeFile("meeting.mp4", "video/mp4")] },
      });
    });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
