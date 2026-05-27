---
date: 2026-05-26
unit: 1 (poprawki po review)
status: reviewed
commit: 5a52b25
---

# Code Review — Unit 1 Fixes

**Branch:** `feature/video-transcription-mvp`
**Commit:** `5a52b25`
**Agents:** Security, Architecture/TypeScript, Test Coverage

---

## Consolidated Findings

### 🟠 P2-important (7)

| # | Plik | Problem |
|---|------|---------|
| F1 | `lib/resend.ts:26` | HTML injection — `params.appUrl` interpolowany bezpośrednio do HTML; powinno być `env.APP_URL` (env-validated) zamiast parametru |
| F2 | `lib/assemblyai.ts:93,111` | `console.error` w kodzie produkcyjnym — loguje body z zewnętrznego API (info leak); narusza reguły projektu (structured logging only) |
| F3 | `lib/__tests__/resend.test.ts:2` | `import type { Resend as ResendType }` — import nieużywany, pozostałość po refaktorze |
| F4 | `lib/__tests__/resend.test.ts:8-12` | `as never` assertion na klasie mockującej — narusza reguły projektu; zastąpić arrow-function factory `() => ({ emails: { send: mockSend } })` |
| F5 | `lib/__tests__/assemblyai.test.ts` | Brakujący test: `createTranscript` z całkowicie nieprawidłowym URL (`"not-a-url"`) — gałąź `catch` w `validateAudioUrl` nieprzetestowana |
| F6 | `lib/__tests__/assemblyai.test.ts` | Brakujący test: `getTranscript` z malformed API response (np. brak pola `id`) — `GetTranscriptResponseSchema.parse()` nigdy nie testowany na failure path |
| F7 | `lib/__tests__/resend.test.ts` | Brakujący test: `sendTranscriptionReadyEmail` przy braku env vars — ścieżka błędu env nie jest pokryta |

### 🟡 P3-nit (3)

| # | Plik | Problem |
|---|------|---------|
| N1 | `lib/__tests__/env.test.ts:20` | `vi.resetModules()` w `afterEach` redundantny — wystarczy `beforeEach`; podwójny reset może maskować flaky behavior |
| N2 | `lib/assemblyai.ts:48` | `TRANSCRIPT_ID_PATTERN` bez komentarza o źródle — jeśli AssemblyAI zmieni format ID, pattern zacznie rzucać false positives |
| N3 | `lib/resend.ts` | `params.to` bez walidacji formatu email — caller może przekazać dowolny string |

---

## Severity Gate

⚠️ **KONTYNUUJ Z ZASTRZEŻENIAMI** — 0 P1 blocking, 7 P2 do naprawy

**Najwyższy priorytet przed Unit 3:**
- F1 (HTML injection w resend.ts) — security issue, łatwa jednoliniowa poprawka
- F2 (console.error w prod) — do usunięcia lub zastąpienia loggerem
- F4 (as never assertion) — narusza reguły projektu, prosta poprawka
- F3 (unused import) — dead code

---

## Co działa dobrze

- Zod v4 API użyte poprawnie — `z.infer`, `z.enum`, `.parse()` vs `.safeParse()` właściwie dobrane
- `server-only` + vitest alias przez `__mocks__/` — eleganckie rozwiązanie
- `getResendClient()` jako lazy factory — testowalne i poprawne
- Sanityzacja `transcriptId` i `audioUrl` — dobre security defaults
- env.ts coverage — 7/7 scenariuszy pokrytych
