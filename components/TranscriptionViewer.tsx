import type { Utterance } from "@/hooks/useTranscriptionPolling";
import { msToTimestamp } from "@/lib/formatters";

interface TranscriptionViewerProps {
  utterances: Utterance[];
  speakerNames: Record<string, string>;
  detectedLanguage?: string;
}

export default function TranscriptionViewer({
  utterances,
  speakerNames,
  detectedLanguage,
}: TranscriptionViewerProps) {
  return (
    <div className="space-y-4">
      {detectedLanguage && (
        <p className="text-xs text-muted-foreground text-right">
          Wykryty język: <span className="font-medium">{detectedLanguage.toUpperCase()}</span>
        </p>
      )}
      <ol className="space-y-4" aria-label="Transkrypcja">
        {utterances.map((u, i) => {
          const name = speakerNames[u.speaker] ?? u.speaker;
          return (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <span className="text-xs text-muted-foreground font-mono mt-0.5 whitespace-nowrap">
                {msToTimestamp(u.start)}
              </span>
              <div>
                <span className="text-sm font-semibold">{name}</span>
                <p className="text-sm text-foreground mt-0.5">{u.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
