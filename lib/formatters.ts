import type { Utterance } from "@/hooks/useTranscriptionPolling";

export function msToTimestamp(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const milli = ms % 1_000;

  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":") + "." + String(milli).padStart(3, "0");
}

function srtTimestamp(ms: number): string {
  return msToTimestamp(ms).replace(".", ",");
}

export function toTxt(
  utterances: Utterance[],
  speakerNames: Record<string, string>
): string {
  let result = "";
  for (const u of utterances) {
    const name = speakerNames[u.speaker] ?? u.speaker;
    if (result) result += "\n\n";
    result += `${msToTimestamp(u.start)} - ${name}\n${u.text}`;
  }
  return result;
}

export function toSrt(
  utterances: Utterance[],
  speakerNames: Record<string, string>
): string {
  let result = "";
  for (let i = 0; i < utterances.length; i++) {
    const u = utterances[i];
    const name = speakerNames[u.speaker] ?? u.speaker;
    if (result) result += "\n\n";
    result += `${i + 1}\n${srtTimestamp(u.start)} --> ${srtTimestamp(u.end)}\n${name}: ${u.text}`;
  }
  return result;
}

export function toMarkdown(
  utterances: Utterance[],
  speakerNames: Record<string, string>
): string {
  let result = "";
  for (const u of utterances) {
    const name = speakerNames[u.speaker] ?? u.speaker;
    if (result) result += "\n\n";
    result += `## ${msToTimestamp(u.start)} - ${name}\n\n${u.text}`;
  }
  return result;
}

const MAX_PDF_SIZE_MB = 5;

// PDF layout constants
const PDF_HEADER_FONT_SIZE = 11;
const PDF_BODY_FONT_SIZE = 10;
const PDF_MARGIN = 10;
const PDF_HEADER_LINE_HEIGHT = 7;
const PDF_BODY_LINE_HEIGHT = 5;
const PDF_UTTERANCE_SPACING = 4;

export async function toPdf(
  utterances: Utterance[],
  speakerNames: Record<string, string>
): Promise<ArrayBuffer> {
  const estimatedBytes = utterances.reduce((sum, u) => {
    return sum + u.text.length + 50;
  }, 1000);
  const estimatedMB = estimatedBytes / (1024 * 1024);

  if (estimatedMB > MAX_PDF_SIZE_MB) {
    throw new Error(
      `Transcript too large for PDF export (~${estimatedMB.toFixed(1)}MB). ` +
      `Please use TXT or SRT format instead.`
    );
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = PDF_MARGIN;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - 2 * PDF_MARGIN;

  for (const u of utterances) {
    const name = speakerNames[u.speaker] ?? u.speaker;
    const timestamp = msToTimestamp(u.start);
    const header = `${timestamp} - ${name}`;

    doc.setFontSize(PDF_HEADER_FONT_SIZE);
    doc.setFont("helvetica", "bold");
    const headerLines = doc.splitTextToSize(header, maxWidth);
    for (const line of headerLines) {
      if (y + PDF_HEADER_LINE_HEIGHT > pageHeight - PDF_MARGIN) {
        doc.addPage();
        y = PDF_MARGIN;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).text(line, PDF_MARGIN, y);
      y += PDF_HEADER_LINE_HEIGHT;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_BODY_FONT_SIZE);
    const textLines = doc.splitTextToSize(u.text, maxWidth);
    for (const line of textLines) {
      if (y + PDF_BODY_LINE_HEIGHT > pageHeight - PDF_MARGIN) {
        doc.addPage();
        y = PDF_MARGIN;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).text(line, PDF_MARGIN, y);
      y += PDF_BODY_LINE_HEIGHT;
    }

    y += PDF_UTTERANCE_SPACING;
  }

  return doc.output("arraybuffer") as ArrayBuffer;
}
