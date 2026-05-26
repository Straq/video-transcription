export type TranscriptStatus =
  | "queued"
  | "processing"
  | "completed"
  | "error";

export interface Utterance {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface TranscriptResult {
  id: string;
  status: TranscriptStatus;
  utterances?: Utterance[];
  detectedLanguage?: string;
  error?: string;
}

export interface CreateTranscriptParams {
  audioUrl: string;
}

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2";

function getApiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY is not set");
  return key;
}

function assemblyHeaders(): HeadersInit {
  return {
    Authorization: getApiKey(),
    "Content-Type": "application/json",
  };
}

export async function createTranscript(
  params: CreateTranscriptParams
): Promise<string> {
  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: "POST",
    headers: assemblyHeaders(),
    body: JSON.stringify({
      audio_url: params.audioUrl,
      speech_model: "universal",
      speaker_labels: true,
      language_detection: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `AssemblyAI create transcript failed: ${response.status} ${body}`
    );
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

export async function getTranscript(id: string): Promise<TranscriptResult> {
  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${id}`, {
    headers: assemblyHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `AssemblyAI get transcript failed: ${response.status} ${body}`
    );
  }

  const data = (await response.json()) as {
    id: string;
    status: TranscriptStatus;
    utterances?: Array<{
      start: number;
      end: number;
      speaker: string;
      text: string;
    }>;
    language_code?: string;
    error?: string;
  };

  return {
    id: data.id,
    status: data.status,
    utterances: data.utterances?.map((u) => ({
      start: u.start,
      end: u.end,
      speaker: u.speaker,
      text: u.text,
    })),
    detectedLanguage: data.language_code,
    error: data.error,
  };
}
