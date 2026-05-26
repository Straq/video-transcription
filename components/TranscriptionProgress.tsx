import type { TranscriptionState } from "@/hooks/useTranscriptionPolling";

interface TranscriptionProgressProps {
  state: TranscriptionState;
}

function statusLabel(status: TranscriptionState["status"]): string {
  switch (status) {
    case "queued": return "Plik w kolejce…";
    case "processing": return "Trwa transkrypcja…";
    case "completed": return "Transkrypcja zakończona";
    case "timeout": return "Przekroczono limit czasu";
    default: return "";
  }
}

function progressValue(state: TranscriptionState): number {
  switch (state.status) {
    case "queued": return 10;
    case "processing": return 50;
    case "completed": return 100;
    default: return 0;
  }
}

export default function TranscriptionProgress({ state }: TranscriptionProgressProps) {
  if (state.status === "idle") return null;

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-6 text-center"
      >
        <p className="font-semibold text-destructive">Błąd transkrypcji</p>
        <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  const percentage = progressValue(state);
  const label = statusLabel(state.status);
  const isAnimated = state.status === "processing";

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary/50 p-12 text-center">
      <p className="text-lg font-semibold">{label}</p>
      <div className="w-full space-y-2">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Postęp transkrypcji"
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={[
              "h-full bg-primary transition-all duration-500",
              isAnimated ? "animate-pulse" : "",
            ].join(" ").trim()}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {state.status !== "completed" && (
          <p className="text-sm text-muted-foreground">{percentage}%</p>
        )}
        {state.status === "timeout" && (
          <p className="text-sm text-muted-foreground">
            Transkrypcja trwała zbyt długo. Spróbuj ponownie.
          </p>
        )}
      </div>
    </div>
  );
}
