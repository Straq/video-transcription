interface UploadProgressProps {
  progress: number;
}

export default function UploadProgress({ progress }: UploadProgressProps) {
  const percentage = Math.round(Math.min(Math.max(progress, 0), 100));

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary/50 p-12 text-center">
      <p className="text-lg font-semibold">Trwa upload…</p>
      <div className="w-full space-y-2">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Postęp uploadu"
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{percentage}%</p>
      </div>
    </div>
  );
}
