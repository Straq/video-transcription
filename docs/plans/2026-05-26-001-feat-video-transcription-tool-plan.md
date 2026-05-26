---
title: "feat: Video Transcription Tool"
type: feat
status: active
date: 2026-05-26
origin: docs/dev-brainstorms/2026-05-26-video-transcription-requirements.md
---

# feat: Video Transcription Tool

## Przegląd

Nowa standalone aplikacja webowa do konwersji nagrań wideo ze spotkań (Google Meets, do 1GB) na tekst. Upload bezpośrednio z przeglądarki do Vercel Blob (pomija limit Vercel Functions 4.5MB), transkrypcja przez AssemblyAI Universal-3 Pro z speaker diarization, edycja nazw mówców w przeglądarce, download w 4 formatach. Deploy na Vercel, zero auth.

## Ujęcie problemu

Nagrania spotkań w języku polskim wymagają ręcznej transkrypcji lub płatnych narzędzi. Narzędzie dostępne pod publicznym adresem Vercel pozwala wgrać plik, poczekać na wynik i pobrać transkrypcję — bez konfiguracji, bez konta.

(zob. źródło: docs/dev-brainstorms/2026-05-26-video-transcription-requirements.md)

## Śledzenie wymagań

- R1. Upload pliku wideo do 1GB przez interfejs webowy
- R2. AssemblyAI Universal-3 Pro + Universal-2 fallback, speaker diarization, timestamps, auto language detection
- R3. Progress bar z aktualnym statusem podczas przetwarzania (polling)
- R4. Opcjonalne powiadomienie e-mail gdy gotowe (Resend)
- R5. Wynik w formacie `HH:MM:SS.mmm - Imię Mówcy\nTekst`
- R6. Edytowalne nazwy mówców przed downloadem
- R7. Download: TXT, SRT, Markdown, PDF
- R8. Plik wideo ephemeral — usuwany po transkrypcji
- R9. Publicznie dostępna aplikacja na Vercel, brak auth
- R10. Zero rejestracji / logowania

## Granice scope'u

- Brak persystencji transkrypcji — sesja przeglądarki only
- Brak historii uploadów
- Brak integracji Google Calendar
- Brak auth / user accounts
- Link sharing tylko do narzędzia, nie do konkretnej transkrypcji

## Kontekst i research

### Tech stack

- **Framework**: Next.js 15 App Router, TypeScript strict
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Upload duże pliki**: Vercel Blob `@vercel/blob/client` — `handleUpload` pattern (presigned client token, browser uploaduje bezpośrednio do CDN, omija 4.5MB limit Vercel Functions)
- **Transcription API**: AssemblyAI REST API (`/v2/upload`, `/v2/transcript`)
- **Email**: Resend SDK (użytkownik ma konto i API key)
- **PDF client-side**: `jsPDF` lub `@react-pdf/renderer`
- **Deploy**: Vercel, auto-deploy z GitHub push

### Wzorzec upload (kluczowy)

```
Browser → POST /api/blob/upload-url → Vercel (generuje client token)
Browser → PUT <Vercel Blob CDN URL> (bezpośrednio, bez Vercel Function)
Backend → POST api.assemblyai.com/v2/transcript { audio_url: <blob_url> }
AssemblyAI → pobiera plik z Blob URL
Backend → DELETE Blob URL (po completed/error)
```

### AssemblyAI API shape

```typescript
// POST /v2/transcript
{
  audio_url: string,
  speech_models: ["universal-3-pro", "universal-2"],
  language_detection: true,
  speaker_labels: true
}

// GET /v2/transcript/:id (polling)
{
  status: "queued" | "processing" | "completed" | "error",
  utterances: Array<{
    start: number,  // ms
    end: number,    // ms
    speaker: string, // "A", "B", "C"...
    text: string
  }>
}
```

### Referencje zewnętrzne

- AssemblyAI speaker diarization: https://www.assemblyai.com/docs/pre-recorded-audio/label-speakers
- AssemblyAI language detection: https://www.assemblyai.com/docs/pre-recorded-audio/language-detection
- Vercel Blob client upload: https://vercel.com/docs/storage/vercel-blob/client-upload

## Kluczowe decyzje techniczne

- **Vercel Blob jako staging**: jedyne rozwiązanie dla 1GB w Vercel bez własnego serwera. Plik usuwany po zakończeniu transkrypcji — koszt pomijalny dla personal use.
- **Polling zamiast webhooks**: prostsze (brak publicznego webhook URL w dev), SSE lub `setInterval` co 5s z exponential backoff do 30s.
- **PDF client-side**: `jsPDF` — brak Puppeteer na Vercel, zero latency serwera.
- **Stan tylko w przeglądarce**: transcript ID w `sessionStorage`, dane utterances w React state — brak bazy danych.
- **Email bez preview transkrypcji**: transkrypcja jest ephemeral, email zawiera tylko info "gotowe" + link do narzędzia.

## Otwarte pytania

### Rozwiązane podczas planowania

- **Upload 1GB przez Vercel**: Vercel Blob `handleUpload` client token pattern — browser uploaduje bezpośrednio z presigned URL, omija 4.5MB API route limit.
- **Polling interval**: 5s przez pierwsze 2 min, potem 15s do max 20 min timeout (1GB plik).
- **PDF generation**: client-side `jsPDF` — brak zależności serwera.
- **Email format**: prosty HTML email "Twoja transkrypcja jest gotowa" + link do narzędzia, bez preview tekstu (dane nie są persystowane).

### Odroczone do implementacji

- Dokładna obsługa rate limiting AssemblyAI (429) — retry z backoff.
- Wercel Blob storage limit vs rozmiar pliku — sprawdzić podczas implementacji czy Vercel Free tier obsługuje 1GB (limit 500MB; może wymagać Pro).
- Chunk size dla Vercel Blob multipart jeśli >500MB.

## Implementation Units

---

- [x] **Unit 1: Project Setup**

**Cel:** Bootstrapuj nową aplikację Next.js z pełnym stackiem, env vars i strukturą folderów.

**Wymagania:** R9 (Vercel deploy), R10 (brak auth)

**Zależności:** Brak

**Pliki:**
- Stwórz: `package.json`, `tsconfig.json`, `next.config.ts`
- Stwórz: `app/layout.tsx`, `app/page.tsx`
- Stwórz: `.env.local` (template), `.env.example`
- Stwórz: `lib/assemblyai.ts` (klient AssemblyAI)
- Stwórz: `lib/resend.ts` (klient Resend)

**Podejście:**
- `npx create-next-app@latest` z TypeScript, Tailwind, App Router
- Zainstaluj: `@vercel/blob`, `assemblyai` lub fetch-based client, `resend`, `jspdf`
- Env vars: `ASSEMBLYAI_API_KEY`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`
- TypeScript strict mode ON

**Wzorce do naśladowania:**
- watermark-app: struktura `lib/` dla logiki domenowej

**Scenariusze testowe:**
- [Unit] `lib/assemblyai.ts` eksportuje typy `Utterance`, `TranscriptStatus`, `TranscriptResult`
- [Unit] env vars walidowane przy starcie (throw jeśli brak klucza API)

**Weryfikacja:**
- `npm run build` bez błędów
- `npm run dev` serwuje stronę główną

**Do poprawy po review Unit 1:**

- [x] 🟠 [P2-1] **lib/env.ts, lib/assemblyai.ts, lib/resend.ts** — dodaj `import "server-only"` na początku każdego pliku
- [x] 🟠 [P2-2] **app/globals.css:10** — zamień `"Geist"` na `var(--font-geist-sans)` (font wiring broken)
- [x] 🟠 [P2-3] **package.json** — usuń `assemblyai` SDK z deps lub zastąp nim raw fetch client; zdecyduj jedno podejście
- [x] 🟠 [P2-4] **package.json** — przenieś `shadcn` z `dependencies` do `devDependencies`
- [x] 🟠 [P2-5] **lib/assemblyai.ts:62,78** — zastąp `as` assertions Zod schema lub runtime shape check
- [x] 🟠 [P2-6] **lib/__tests__/assemblyai.test.ts:146** — usuń `utterances!` — użyj `result.utterances?.at(0)`
- [x] 🟠 [P2-7] **lib/assemblyai.ts, lib/resend.ts** — importuj `env` z `lib/env.ts` zamiast czytać `process.env` bezpośrednio
- [x] 🟠 [P2-8] **lib/__tests__/assemblyai.test.ts** — usuń lub przepisz `describe("AssemblyAI types")` — testy type-shape nie mają wartości runtime
- [x] 🟠 [P2-9] **lib/resend.ts** — dodaj plik testowy `lib/__tests__/resend.test.ts` z happy path i error case
- [x] 🟠 [P2-10] **lib/__tests__/assemblyai.test.ts** — dodaj: getTranscript error case, status "error" i "queued", asercja `speech_model` w createTranscript
- [x] 🟡 [N1] **app/layout.tsx** — zmień `lang="en"` na `lang="pl"`
- [x] 🟡 [N2] **lib/env.ts** — `RESEND_FROM_EMAIL` bez default lub zmień na realistyczny adres
- [x] 🟡 [N3] **vitest.config.ts** — usuń `globals: true` (testy importują explicite, nie korzystają z globals)
- [x] 🟡 [N4] **package.json** — zamień `^` na exact versions we wszystkich dependencies

---

- [ ] **Unit 2: Upload UI + Vercel Blob**

**Cel:** Komponent dropzone z progress barem, bezpośredni upload do Vercel Blob przez client token.

**Wymagania:** R1 (upload do 1GB), R8 (ephemeral)

**Zależności:** Unit 1

**Pliki:**
- Stwórz: `app/api/blob/upload-url/route.ts` — generuje client token przez `handleUpload()`
- Stwórz: `components/UploadDropzone.tsx`
- Stwórz: `components/UploadProgress.tsx`
- Test (unit): `components/__tests__/UploadDropzone.test.tsx`

**Podejście:**
- `UploadDropzone`: przyjmuje drag&drop lub klik, waliduje rozmiar (max 1GB) i typ (video/*)
- Używa `@vercel/blob/client` `upload()` z callbackiem `onUploadProgress` dla progress bar
- `/api/blob/upload-url`: `handleUpload()` z `allowedContentTypes: ['video/*', 'audio/*']`
- Po udanym uplodie zwraca `{ url: string }` do komponentu rodzica

**Scenariusze testowe:**
- [Unit] Walidacja: plik >1GB wyświetla błąd bez uploadu
- [Unit] Walidacja: plik non-video wyświetla błąd
- [Unit] Progress callback aktualizuje stan komponentu
- [E2E] Otwórz `/`, przeciągnij plik MP4, sprawdź progress bar, sprawdź że "Upload zakończony" pojawia się

**Weryfikacja:**
- Plik wideo wgrany do Vercel Blob, zwrócony URL dostępny z przeglądarki

---

- [ ] **Unit 3: AssemblyAI Transcription API**

**Cel:** Server-side endpointy do tworzenia joba transkrypcji i sprawdzania statusu. Cleanup Blob po zakończeniu.

**Wymagania:** R2 (AssemblyAI), R8 (ephemeral storage)

**Zależności:** Unit 2 (potrzebny blob URL jako wejście)

**Pliki:**
- Stwórz: `app/api/transcribe/route.ts` — POST, tworzy job transkrypcji
- Stwórz: `app/api/transcribe/[id]/route.ts` — GET, pobiera status i wynik
- Stwórz: `lib/assemblyai.ts` — funkcje `createTranscript()`, `getTranscript()`, `deleteBlob()`
- Test (unit): `lib/__tests__/assemblyai.test.ts`

**Podejście:**
- `POST /api/transcribe`: `{ blobUrl }` → AssemblyAI `{ audio_url: blobUrl, speaker_labels: true, speech_models: [...], language_detection: true }` → zwraca `{ transcriptId }`
- `GET /api/transcribe/[id]`: pobiera status z AssemblyAI → jeśli `completed` usuwa Blob URL → zwraca `{ status, utterances?, detectedLanguage? }`
- Cleanup: `del()` z `@vercel/blob` po `completed` lub `error`

**Scenariusze testowe:**
- [Unit] `createTranscript()` wysyła poprawne parametry do AssemblyAI
- [Unit] `getTranscript()` zwraca `{ status: 'processing' }` gdy jeszcze nie gotowe
- [Unit] Blob cleanup wywoływany po `completed` i `error`
- [Unit] `getTranscript()` zwraca `utterances` z poprawnymi typami

**Weryfikacja:**
- POST `/api/transcribe` z prawdziwym Blob URL zwraca transcript ID
- GET `/api/transcribe/:id` zwraca status `queued` lub `processing`

---

- [ ] **Unit 4: Polling + Progress UI**

**Cel:** Frontend polling statusu co 5s (potem 15s), progress bar ze statusem, obsługa timeout i błędów.

**Wymagania:** R3 (progress bar)

**Zależności:** Unit 3

**Pliki:**
- Stwórz: `hooks/useTranscriptionPolling.ts`
- Stwórz: `components/TranscriptionProgress.tsx`
- Test (unit): `hooks/__tests__/useTranscriptionPolling.test.ts`

**Podejście:**
- Hook `useTranscriptionPolling(transcriptId)`: `useEffect` z `setInterval`, 5s przez pierwsze 2 min, 15s do max 20 min, `AbortController` w cleanup
- Stany: `idle | uploading | queued | processing | completed | error | timeout`
- Discriminated union zamiast wielu boolean flags
- Progress bar: `queued` → 10%, `processing` → animowany 10-90%, `completed` → 100%

**Scenariusze testowe:**
- [Unit] Hook wywołuje callback po zmianie statusu
- [Unit] Cleanup anuluje `setInterval` po unmount
- [Unit] Timeout po 20 min przechodzi w stan `timeout`
- [E2E] Wgraj plik, sprawdź że progress bar animuje się podczas przetwarzania

**Weryfikacja:**
- Status zmienia się z `queued` → `processing` → `completed` w UI
- Po zakończeniu wyświetla się `TranscriptionViewer`

---

- [ ] **Unit 5: Transcript Viewer + Speaker Editor**

**Cel:** Wyświetlenie utterances w formacie `HH:MM:SS.mmm - Imię`, inline edycja nazw mówców.

**Wymagania:** R5 (format wyświetlania), R6 (edytowalne nazwy mówców)

**Zależności:** Unit 4

**Pliki:**
- Stwórz: `components/TranscriptionViewer.tsx`
- Stwórz: `components/SpeakerNameEditor.tsx`
- Stwórz: `lib/formatters.ts` — `msToTimestamp(ms: number): string` → `HH:MM:SS.mmm`
- Test (unit): `lib/__tests__/formatters.test.ts`
- Test (unit): `components/__tests__/SpeakerNameEditor.test.tsx`

**Podejście:**
- `TranscriptionViewer`: lista utterances, każda linia: `{timestamp} - {speakerName}\n{text}`
- `SpeakerNameEditor`: panel boczny lub inline, mapa `{ "A": "Paweł", "B": "Dave" }`, zapis w React state
- `msToTimestamp`: `Math.floor(ms / 3600000)` pad, minuty, sekundy, ms — format `HH:MM:SS.mmm`
- State `speakerNames: Record<string, string>` przekazywany do komponentu download

**Scenariusze testowe:**
- [Unit] `msToTimestamp(23353)` → `"00:00:23.353"`
- [Unit] `msToTimestamp(3661000)` → `"01:01:01.000"`
- [Unit] Edycja Speaker A zmienia nazwę w całym transkrypcie
- [E2E] Otwórz viewer, edytuj "Speaker A" → "Paweł", sprawdź że wszystkie linie A zmieniają nazwę

**Weryfikacja:**
- Format timestampów zgodny z przykładem z brainstormu (`00:00:23.353 - Paweł Strączek`)
- Zmiana nazwy mówcy w edytorze propaguje się do podglądu

---

- [ ] **Unit 6: Download Formatters**

**Cel:** Generowanie i download TXT, SRT, Markdown, PDF z opcjonalnie podmienionymi nazwami mówców.

**Wymagania:** R7 (download 4 formaty)

**Zależności:** Unit 5

**Pliki:**
- Rozszerz: `lib/formatters.ts` — `toTxt()`, `toSrt()`, `toMarkdown()`, `toPdf()`
- Stwórz: `components/DownloadButtons.tsx`
- Test (unit): `lib/__tests__/formatters.test.ts`

**Podejście:**
- `toTxt(utterances, speakerNames)`: join z `\n`, format `HH:MM:SS.mmm - {name}\n{text}\n`
- `toSrt(utterances, speakerNames)`: standard SRT format — numerowane bloki, `HH:MM:SS,mmm --> HH:MM:SS,mmm`, `{name}: {text}`
- `toMarkdown(utterances, speakerNames)`: `## HH:MM:SS.mmm - {name}\n{text}\n`
- `toPdf(utterances, speakerNames)`: `jsPDF` client-side, `doc.text()` z line wrapping
- Download przez `URL.createObjectURL(new Blob([content]))` + `<a>.click()`

**Scenariusze testowe:**
- [Unit] `toSrt()` generuje poprawny format z numeracją i `-->` separatorem
- [Unit] `toSrt()` używa `HH:MM:SS,mmm` (przecinek) nie `HH:MM:SS.mmm` (standard SRT)
- [Unit] `toMarkdown()` generuje nagłówki H2 dla każdej zmiany mówcy
- [Unit] Podmienione nazwy mówców (`speakerNames`) używane we wszystkich formatach
- [E2E] Kliknij "Download TXT", sprawdź że plik pobrał się z poprawną treścią

**Weryfikacja:**
- Każdy z 4 przycisków downloaduje plik z poprawnym rozszerzeniem i treścią

---

- [ ] **Unit 7: Email Notification**

**Cel:** Opcjonalne powiadomienie e-mail przez Resend gdy transkrypcja gotowa.

**Wymagania:** R4 (e-mail)

**Zależności:** Unit 3 (wywoływane gdy status `completed`)

**Pliki:**
- Stwórz: `app/api/notify/route.ts` — POST wysyła email
- Rozszerz: `lib/resend.ts` — `sendTranscriptionReadyEmail(to: string)`
- Rozszerz: `app/api/transcribe/[id]/route.ts` — wywołanie notify gdy completed
- Test (unit): `lib/__tests__/resend.test.ts`

**Podejście:**
- Formularz upload zawiera opcjonalne pole `email`
- `POST /api/notify`: `{ email, transcriptId }` → Resend `sendEmail()`
- Email: plaintext/HTML "Twoja transkrypcja jest gotowa. Wróć do [URL]." — bez treści transkrypcji (ephemeral)
- Sender: `noreply@<domena>` — sprawdzić konfigurację Resend dla domeny

**Wzorce do naśladowania:**
- `project_resend.md` z memory — użytkownik ma API key i skonfigurowaną domenę nadawcy

**Scenariusze testowe:**
- [Unit] `sendTranscriptionReadyEmail()` wywołuje Resend z poprawnym `to`, `subject`, `html`
- [Unit] Brak emaila w formularzu = brak wywołania notify
- [E2E] Podaj email przed uploadem, sprawdź że email przychodzi po zakończeniu

**Weryfikacja:**
- Email dostarczony na podany adres po zakończeniu transkrypcji

---

## Wpływ systemowy

- **Vercel Blob cleanup**: jeśli Vercel Function crashuje po completed, Blob może nie zostać usunięty — rozważyć TTL lub scheduled cleanup podczas implementacji
- **Polling race condition**: jeśli użytkownik zamknie kartę podczas pollingu, Blob nie zostanie usunięty (akceptowalne dla personal use, brak persystencji sesji)
- **AssemblyAI timeout**: maxDuration Vercel Function = 300s; polling jest po stronie klienta więc nie dotyczy API routes

## Ryzyka i zależności

- **Vercel Blob limit 500MB (Free tier)**: 1GB plik może wymagać Vercel Pro ($20/mo) lub chunked upload. Sprawdzić podczas Unit 2 — jeśli limit 500MB, zaktualizować walidację w UI.
- **AssemblyAI koszt**: Universal-3 Pro jest droższy od Universal-2; dla 1GB wideo (ok. 1-2h audio) koszt to ~$1-3 per transkrypcja.
- **Resend domena**: email nadawcy musi być zweryfikowany w Resend — sprawdzić konfigurację przed Unit 7.

## Źródła i referencje

- **Dokument źródłowy**: [docs/dev-brainstorms/2026-05-26-video-transcription-requirements.md](docs/dev-brainstorms/2026-05-26-video-transcription-requirements.md)
- AssemblyAI speaker labels: https://www.assemblyai.com/docs/pre-recorded-audio/label-speakers
- AssemblyAI language detection: https://www.assemblyai.com/docs/pre-recorded-audio/language-detection
- Vercel Blob client upload: https://vercel.com/docs/storage/vercel-blob/client-upload
- Resend (z memory: użytkownik ma konto i API key)
