---
date: 2026-05-26
unit: 1
status: reviewed
---

# Code Review — Unit 1: Project Setup

**Branch:** `feature/video-transcription-mvp`  
**Commit:** `183fc83`  
**Agents:** Security, Performance, Architecture/TypeScript, Test Coverage

---

## Consolidated Findings

### 🟠 P2-important (10)

| # | Plik | Problem |
|---|------|---------|
| P2-1 | `lib/env.ts`, `lib/assemblyai.ts`, `lib/resend.ts` | Brak `import "server-only"` — klucze API mogą wyciec do client bundle jeśli moduł zostanie zaimportowany w Client Component |
| P2-2 | `app/globals.css:10` | Font wiring broken — `--font-sans: "Geist"` (literal) zamiast `var(--font-geist-sans)` — next/font preload/swap jest bezużyteczny |
| P2-3 | `package.json` | SDK `assemblyai` w `dependencies` ale `lib/assemblyai.ts` używa raw fetch — SDK jest dead weight (~52KB) w każdym cold start |
| P2-4 | `package.json` | `shadcn` CLI w `dependencies` zamiast `devDependencies` — instalowany w każdym prod deploy |
| P2-5 | `lib/assemblyai.ts:62,78` | `as` type assertions na `response.json()` — `fetch` returns `unknown`, cast bypasses runtime type check; api shape change = silent bug |
| P2-6 | `lib/__tests__/assemblyai.test.ts:146` | Non-null assertion `utterances!` narusza reguły projektu — użyj `result.utterances?.at(0)` |
| P2-7 | `lib/assemblyai.ts`, `lib/resend.ts` | Dual env access — obie biblioteki czytają `process.env` bezpośrednio zamiast importować z `lib/env.ts`; `RESEND_FROM_EMAIL` zduplikowany fallback |
| P2-8 | `lib/__tests__/assemblyai.test.ts` | `describe("AssemblyAI types")` — testy weryfikują TypeScript interfaces, nie runtime behaviour; nie mają wartości jako testy |
| P2-9 | `lib/resend.ts` | Brak jakichkolwiek testów — publiczny serwis wysyłający e-maile bez coverage |
| P2-10 | `lib/__tests__/assemblyai.test.ts` | Brakujące scenariusze: `getTranscript` bez error case, bez testu `status: "error"` i `"queued"`, brak asercji `speech_model` w `createTranscript` |

### 🟡 P3-nit (12)

| # | Plik | Problem |
|---|------|---------|
| N1 | `app/layout.tsx` | `lang="en"` przy polskiej treści — zmień na `lang="pl"` |
| N2 | `lib/env.ts:10` | `RESEND_FROM_EMAIL` default = `noreply@example.com` — RFC 2606 reserved; w prod wyślij e-mail z nieprawidłowego adresu zamiast fail fast |
| N3 | `vitest.config.ts` + `tsconfig.json` | `globals: true` w vitest ale brak `"vitest/globals"` w tsconfig types; testy i tak importują explicite — remove `globals: true` |
| N4 | `package.json` | Wszystkie deps używają `^` carets — reguły projektu wymagają exact version pins |
| N5 | `lib/assemblyai.ts:67` | `getTranscript(id)` — brak sanityzacji `id` przed interpolacją do URL; przyszłe routes mogą przekazać wartość z user input |
| N6 | `lib/assemblyai.ts:55-74` | Raw API error body forwarded to caller — information leakage; loguj server-side, throw sanitized message |
| N7 | `lib/assemblyai.ts:41` | `audioUrl` nie walidowany — potencjalny SSRF risk gdy zostanie podany przez user input w Unit 2 |
| N8 | `package.json` | `jspdf` (~336KB) będzie musiał być importowany przez `dynamic import` / `React.lazy()` gdy użyty — teraz w deps ale nieużywany |
| N9 | `lib/resend.ts` | Niezgodny z Edge runtime (resend wymaga Node 20+) — API routes używające Resend muszą mieć `export const runtime = "nodejs"` |
| N10 | `lib/__tests__/assemblyai.test.ts` | Brak `vi.resetModules()` w `afterEach` dla `createTranscript`/`getTranscript` describe — module cache może powodować flaky tests |
| N11 | `lib/__tests__/assemblyai.test.ts` | `TranscriptStatus` test: `toHaveLength(4)` nie weryfikuje wartości — zmień `"queued"` na `"pending"` i test przejdzie |
| N12 | `lib/__tests__/env.test.ts` | Brak testu dla `RESEND_FROM_EMAIL` default; error message assertions zbyt ogólne (szukaj konkretnego komunikatu Zod) |

---

## Severity Gate

⚠️ **KONTYNUUJ Z ZASTRZEŻENIAMI** — 0 P1 blocking, 10 P2 do naprawy

**Najwyższy priorytet przed Unit 2:**
- P2-1 (server-only) — Unit 2 wprowadza API routes, które są pierwszym punktem użycia tych lib files z untrusted input
- P2-2 (font wiring) — jeden wiersz, naprawia całą next/font optymalizację
- P2-7 (dual env) — centralizacja env access usuwa duplicate fallback i divergent error paths
- P2-3/P2-4 (shadcn/assemblyai w złych deps) — czyste dependency hygiene

---

## Odchylenia od planu Unit 1

| Requirement | Status |
|---|---|
| Export `Utterance`, `TranscriptStatus`, `TranscriptResult` | ✅ Zrealizowane |
| TypeScript strict mode ON | ✅ Zrealizowane |
| Env vars walidowane przy starcie (throw jeśli brak) | ✅ Zrealizowane |
| Wzorzec lib/ dla logiki domenowej | ✅ Zrealizowane |
| `assemblyai` SDK z package.json | ⚠️ SDK w deps ale lib używa raw fetch — nieudokumentowana decyzja |
| Env single source of truth | ⚠️ assemblyai.ts i resend.ts czytają process.env bezpośrednio |
| Brak `as` assertions (reguły projektu) | ⚠️ 2 assercje na response.json() |
