# Unit 7: Email Notifications — Kontekst

## Stan po Unit 6
Po Unit 6, mamy kompletny pipeline transkrypcji: upload → przetwarzanie → wyświetlanie → edycja nazw mówców → download. Unit 7 dodaje opcjonalne powiadomienie e-mail.

## Cele Unit 7
- Opcjonalne pole e-mail na stronie głównej
- Gdy transkrypcja ukończy się, wysłanie powiadomienia do podanego maila
- Integracja z istniejącym serwisem Resend
- Walidacja e-maila z Zod

## Decyzje techniczne

### 1. Frontend: Email input na stronie głównej
- Field: "E-mail (opcjonalnie)" z labelą
- Helper text: "Otrzymasz powiadomienie e-mail gdy transkrypcja będzie gotowa"
- Przechowywanie w React state: `useState<string>("")`
- Przekazanie do POST /api/transcribe razem z blobUrl

### 2. Backend: useEffect hook na stronie głównej
- Słucha zmian `transcriptionState.status`
- Gdy `status === "completed"` i `email` jest podany → fetch do /api/notify
- POST body: `{ email, transcriptId }`
- Catch errors bez blokowania UI

### 3. Nowy endpoint: POST /api/notify
- Walidacja z Zod: email (z email validation), transcriptId (string, min 1)
- Konwersja błędów Zod do user-friendly komunikatów
- Próba wysłania emaila via `sendTranscriptionReadyEmail({ to: email })`
- Zwraca `{ success: true }` lub `{ error: string }`

### 4. Integracja z Resend
- Używa istniejącej funkcji: `sendTranscriptionReadyEmail(params: { to: string })`
- Frontend nie otrzymuje szczegółów emaila
- Error handling: jeśli Resend fail → 500 + error message

## Zmienione/Utworzone pliki

### app/page.tsx (MODIFIED)
- Dodano email input field przed UploadDropzone
- useEffect hook do wysłania notyfikacji po completion
- Linia ~35: `fetch("/api/notify", { method: "POST", ... })`

### app/api/notify/route.ts (NEW)
- 40 linii
- POST handler z Zod validation
- Zod schema: `notifySchema`
- Error handling: JSON parse errors, validation errors, Resend errors

### app/api/notify/__tests__/route.test.ts (NEW)
- 6 testów:
  - Success case (200, { success: true })
  - Missing email (400, error message)
  - Invalid email format (400, "email" in error)
  - Missing transcriptId (400)
  - Invalid JSON (400, "JSON" in error)
  - Resend error (500, error message)

## Rezultat
- ✅ Wszystkie 6 testów Unit 7 przechodzą
- ✅ Całkowicie: 116 testów, 100% pass
- ✅ Zero TypeScript errors
- ✅ Email flow: optional, nie blokuje workflow

## Ostatnia aktualizacja: 2026-05-26
