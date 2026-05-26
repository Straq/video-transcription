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
  return utterances
    .map((u) => {
      const name = speakerNames[u.speaker] ?? u.speaker;
      return `${msToTimestamp(u.start)} - ${name}\n${u.text}`;
    })
    .join("\n\n");
}

export function toSrt(
  utterances: Utterance[],
  speakerNames: Record<string, string>
): string {
  return utterances
    .map((u, i) => {
      const name = speakerNames[u.speaker] ?? u.speaker;
      return `${i + 1}\n${srtTimestamp(u.start)} --> ${srtTimestamp(u.end)}\n${name}: ${u.text}`;
    })
    .join("\n\n");
}

export function toMarkdown(
  utterances: Utterance[],
  speakerNames: Record<string, string>
): string {
  return utterances
    .map((u) => {
      const name = speakerNames[u.speaker] ?? u.speaker;
      return `## ${msToTimestamp(u.start)} - ${name}\n\n${u.text}`;
    })
    .join("\n\n");
}

export async function toPdf(
  utterances: Utterance[],
  speakerNames: Record<string, string>
): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 10;
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;

  for (const u of utterances) {
    const name = speakerNames[u.speaker] ?? u.speaker;
    const timestamp = msToTimestamp(u.start);
    const header = `${timestamp} - ${name}`;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const headerLines = doc.splitTextToSize(header, maxWidth);
    for (const line of headerLines) {
      if (y + 7 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).text(line, margin, y);
      y += 7;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const textLines = doc.splitTextToSize(u.text, maxWidth);
    for (const line of textLines) {
      if (y + 5 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).text(line, margin, y);
      y += 5;
    }

    y += 4;
  }

  return doc.output("arraybuffer") as ArrayBuffer;
}
