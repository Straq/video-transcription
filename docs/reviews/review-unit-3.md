# Code Review — Unit 3: AssemblyAI Transcription API

Data: 2026-05-26  
Pliki: `lib/assemblyai.ts`, `app/api/transcribe/route.ts`, `app/api/transcribe/[id]/route.ts`, testy

## Statystyki

- Agentów: 4 (Security, Performance, Architecture, Test Coverage)
- 🔴 P1-blocking: 0
- 🟠 P2-important: 6
- 🟡 P3-nit: 7

---

## P2 — Ważne (wymagają naprawy)

### [S-P2-1] `app/api/transcribe/route.ts:5-7` — POST akceptuje dowolny HTTPS URL jako blobUrl

Zod schema używa tylko `z.string().url()`. Każdy prawidłowy HTTPS URL jest przyjmowany i przekazywany do AssemblyAI jako `audio_url`. Atakujący może przesłać URL zewnętrznego serwera i wymusić na AssemblyAI pobranie go pod kluczem API aplikacji — wyczerpując quota i umożliwiając nadużycie.

GET route poprawnie sprawdza hosta `.vercel-storage.com`, ale POST nie.

**Fix:** Dodaj `.refine()` do Zod schema w POST route (lub uzupełnij `validateAudioUrl`) o walidację hosta.

---

### [S-P2-2] `lib/assemblyai.ts:103-105`, `[id]/route.ts:27-33` — deleteBlob usuwa dowolny blob z .vercel-storage.com bez walidacji ownership

GET route sprawdza że hostname kończy się `.vercel-storage.com` — to zapobiega usunięciu zewnętrznych URL, ale nie weryfikuje:
- Że blob należy do tego projektu (URL z innego Vercel Blob store też przejdzie)
- Że blob jest powiązany z danym transcript ID

Każdy caller który zna poprawny `.vercel-storage.com` URL może go usunąć przez `?blobUrl=`.

**Decyzja dla personal tool:** Akceptowalne ryzyko (zero-auth by design). Udokumentować jako świadomy wybór.

---

### [S-P2-3] Brak rate limiting — możliwe wyczerpanie quota AssemblyAI

Oba endpointy są publicznie dostępne bez auth i rate limitingu. POST tworzy płatne jobsy AssemblyAI. Unauthenticated caller może złożyć nieograniczoną liczbę requestów.

**Decyzja dla personal tool:** Niskie ryzyko (personal use, brak publicznego adresu URL). Odroczone do ewentualnego hardeningu przed upublicznieniem.

---

### [A-P2-4] `lib/assemblyai.ts:2,103-105` — `deleteBlob` i import `@vercel/blob` w module AssemblyAI — SRP violation

`deleteBlob()` to operacja Vercel Blob, nie AssemblyAI. Moduł importuje `del` z `@vercel/blob` obok `ASSEMBLYAI_BASE_URL` i `assemblyHeaders()`. Przy zmianie którejkolwiek z usług trudno będzie znaleźć logikę.

**Fix:** Przenieś do `lib/blob.ts`. Import w `[id]/route.ts` zmienia się z `@/lib/assemblyai` na `@/lib/blob`.

---

### [T-P2-5] `app/api/transcribe/__tests__/route.test.ts` — brak testu dla HTTP blobUrl w POST

`z.string().url()` akceptuje `http://` URLs. POST route nie sprawdza protokołu — to robi `validateAudioUrl` w assemblyai.ts. Brak testu dokumentującego to zachowanie (HTTP URL → 500 z "Audio URL must use HTTPS").

**Fix:** Dodaj test: `blobUrl: "http://blob.vercel-storage.com/v.mp4"` → 500 z komunikatem "Audio URL must use HTTPS".

---

### [T-P2-6] `app/api/transcribe/[id]/__tests__/route.test.ts:74` — brak asercji `body.error` dla statusu `error`

Test sprawdza `body.status === "error"` i że `deleteBlob` zostało wywołane, ale nie weryfikuje że `body.error === "Audio file corrupted"`. Regresja usuwająca pole `error` z odpowiedzi przejdzie niezauważona.

**Fix:** Dodaj `expect(body.error).toBe("Audio file corrupted")`.

---

## P3 — Nity (sugestie)

### [N1] `(error as Error).message` — type assertion w catch blokach

`app/api/transcribe/route.ts:26`, `[id]/route.ts:43`, `app/api/blob/upload-url/route.ts:22`

Jeśli coś rzuci nie-Error, `.message` będzie `undefined`. Wyciągnij helper:
```ts
// lib/errors.ts
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
```

---

### [N2] `[id]/route.ts` — nieprawidłowy transcript ID zwraca 500 zamiast 400

`validateTranscriptId` rzuca w `getTranscript()`, trafia do zewnętrznego `catch`, który zwraca 500. Błąd klienta (zły ID) powinien dawać 400.

**Fix:** Wywołaj walidację ID na początku GET handlera i zwróć 400.

---

### [N3] `[id]/route.ts:29-33` — pusty `catch {}` bez logowania

Celowe best-effort cleanup, ale systematyczne błędy (np. zrotowany token) będą niewidoczne. Przynajmniej `console.error` dla developmentu.

---

### [N4] `lib/assemblyai.ts:52-57` — `assemblyHeaders()` tworzy nowy obiekt przy każdym wywołaniu

Wynieś do stałej na poziomie modułu. Mikro-optymalizacja, ale bez kosztów.

---

### [N5] `lib/assemblyai.ts:52,59,65` — prywatne funkcje bez explicit return types

`assemblyHeaders()`, `validateTranscriptId()`, `validateAudioUrl()` — TypeScript inference działa poprawnie, ale explicit types są spójne z publicznymi funkcjami.

---

### [N6] `[id]/__tests__/route.test.ts:10` — `ENCODED_BLOB_URL` zdefiniowane ale nieużywane

Dead code. Usuń.

---

### [N7] `[id]/__tests__/route.test.ts:131` — path-traversal ID w teście "getTranscript throws" jest mylący

Mock wymusza throw niezależnie od ID, więc test jest poprawny, ale nazwa sugeruje testowanie path-traversal (który jest już pokryty w `assemblyai.test.ts:189`). Użyj zwykłego `"nonexistent"` jako ID.

---

## E2E Weryfikacja

Weryfikacja `Weryfikacji:` z planu wymaga prawdziwych kluczy API (AssemblyAI, Vercel Blob). `.env.local` zawiera placeholdery — E2E nie jest możliwe bez uzupełnienia kluczy.

- [ ] POST `/api/transcribe` z prawdziwym Blob URL zwraca transcript ID
- [ ] GET `/api/transcribe/:id` zwraca status `queued` lub `processing`

---

## Odchylenia od planu

Plan definiował `lib/__tests__/assemblyai.test.ts` jako główny plik testowy dla Unit 3. Implementacja dodała 2 dodatkowe pliki testowe (route handlery) — to rozszerzenie ponad plan, nie odchylenie.

`deleteBlob` znalazło się w `lib/assemblyai.ts` (zgodnie z planem), ale Architecture review flaguje to jako SRP violation [A-P2-4].
