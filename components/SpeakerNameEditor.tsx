interface SpeakerNameEditorProps {
  speakers: string[];
  names: Record<string, string>;
  onChange: (names: Record<string, string>) => void;
}

export default function SpeakerNameEditor({ speakers, names, onChange }: SpeakerNameEditorProps) {
  if (speakers.length === 0) return null;

  function handleChange(speaker: string, value: string) {
    onChange({ ...names, [speaker]: value });
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Mówcy
      </p>
      <ul className="space-y-2">
        {speakers.map((speaker) => (
          <li key={speaker} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20 shrink-0">{speaker}</span>
            <input
              type="text"
              aria-label={`Nazwa mówcy ${speaker}`}
              value={names[speaker] ?? speaker}
              onChange={(e) => handleChange(speaker, e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
