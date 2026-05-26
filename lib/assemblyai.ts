import "server-only";
import { z } from "zod";
import { env } from "./env";

export const TranscriptStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "error",
]);

export type TranscriptStatus = z.infer<typeof TranscriptStatusSchema>;

const UtteranceSchema = z.object({
  start: z.number(),
  end: z.number(),
  speaker: z.string(),
  text: z.string(),
});

export type Utterance = z.infer<typeof UtteranceSchema>;

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

const CreateTranscriptResponseSchema = z.object({
  id: z.string(),
});

const GetTranscriptResponseSchema = z.object({
  id: z.string(),
  status: TranscriptStatusSchema,
  utterances: z.array(UtteranceSchema).optional(),
  language_code: z.string().optional(),
  error: z.string().optional(),
});

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2";
const TRANSCRIPT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function assemblyHeaders(): HeadersInit {
  return {
    Authorization: env.ASSEMBLYAI_API_KEY,
    "Content-Type": "application/json",
  };
}

function validateTranscriptId(id: string): void {
  if (!TRANSCRIPT_ID_PATTERN.test(id)) {
    throw new Error("Invalid transcript ID format");
  }
}

function validateAudioUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid audio URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Audio URL must use HTTPS");
  }
}

export async function createTranscript(
  params: CreateTranscriptParams
): Promise<string> {
  validateAudioUrl(params.audioUrl);

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
    console.error(`AssemblyAI create transcript error: ${response.status}`, body);
    throw new Error(
      `AssemblyAI create transcript failed with status ${response.status}`
    );
  }

  const data = CreateTranscriptResponseSchema.parse(await response.json());
  return data.id;
}

export async function getTranscript(id: string): Promise<TranscriptResult> {
  validateTranscriptId(id);

  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${id}`, {
    headers: assemblyHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`AssemblyAI get transcript error: ${response.status}`, body);
    throw new Error(
      `AssemblyAI get transcript failed with status ${response.status}`
    );
  }

  const data = GetTranscriptResponseSchema.parse(await response.json());

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
