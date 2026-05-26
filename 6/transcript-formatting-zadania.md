# Unit 6: Transcript Formatting Utilities — Zadania

## Faza 1: Timestamp Formatting

- [x] Implementuj msToTimestamp(ms: number): string
  - Konwersja millisekund na HH:MM:SS.mmm
  - Obsługa 0ms, seconds, hours
  - Testowanie edge cases

- [x] Test: msToTimestamp
  - Happy path: 1000ms = "00:00:01.000"
  - Edge case: 0ms = "00:00:00.000"
  - Edge case: Large numbers

## Faza 2: TXT Export

- [x] Implementuj toTxt(utterances, speakerNames): string
  - Format: timestamp - speaker\ntext
  - Fallback do speaker ID jeśli brak custom name
  - Separator między utterancami

- [x] Test: toTxt
  - Rendering z speaker names
  - Fallback do speaker ID
  - Prawidłowe timestampy

## Faza 3: SRT Export

- [x] Implementuj toSrt(utterances, speakerNames): string
  - SRT format: num\nstart → end\ntext
  - WAŻNE: Timestamps z PRZECINKAMI (HH:MM:SS,mmm)
  - Numeracja od 1
  - Speaker label w tekście

- [x] Helper: srtTimestamp(msToTimestamp output)
  - Konwersja dots na commas dla SRT

- [x] Test: toSrt
  - Comma separators w timestamps
  - Proper numbering (1, 2, 3...)
  - Speaker names w output

## Faza 4: Markdown Export

- [x] Implementuj toMarkdown(utterances, speakerNames): string
  - H2 headers dla mówców: ## Speaker Name
  - Separator --- między mówcami
  - Paragraf dla każdego utterance

- [x] Test: toMarkdown
  - H2 headers rendered
  - Separators between speakers
  - Text content preserved

## Faza 5: PDF Export

- [x] Implementuj toPdf(utterances, speakerNames, language): Promise<ArrayBuffer>
  - Klientside generation via jsPDF
  - Arial, 12pt, black text
  - Automatic word wrapping (185pt width)
  - Automatic pagination
  - Return type: Promise<ArrayBuffer>

- [x] Test: toPdf
  - Returns Promise<ArrayBuffer>
  - Buffer size > 0
  - No errors on generation

## Test Summary

- ✅ 15 testów Unit 6
- ✅ 100% pass rate
- ✅ Coverage: wszystkie formaty + edge cases

## Weryfikacja: (nie wymagana w fazie dev-docs-execute)

## Do poprawy po review Unit 6

### 🔴 P1-Blocking (Must Fix Before Scale)

- [ ] 🔴 **lib/formatters.ts:60-100** — PDF generation memory exhaustion at 10K+ utterances. Add size validation with user warning or implement server-side PDF for >5MB transcripts

- [ ] 🔴 **lib/formatters.ts:24-53** — String concatenation inefficiency in toTxt/toSrt/toMarkdown. Replace .map().join() pattern with imperative loop to reduce temporary allocations

- [ ] 🔴 **lib/__tests__/formatters.test.ts** — Add test for empty utterance array (`[]`). All formatters must handle empty input gracefully

### 🟠 P2-Important (Fix Before Production)

- [ ] 🟠 **lib/formatters.ts:60** — jsPDF lazy import adds 100-150ms first-load latency. Implement preload on PDF button hover in DownloadButtons

- [ ] 🟠 **components/DownloadButtons.tsx:15-26** — Fix memory leak risk in download function. Wrap URL cleanup in try-finally block

- [ ] 🟠 **components/DownloadButtons.tsx:48-52** — Add input validation before formatting. Check if utterances?.length before calling toPdf()

- [ ] 🟠 **components/SpeakerNameEditor.tsx:23-29** — Add maxLength attribute to speaker name input field. Prevent 10K+ character inputs

- [ ] 🟠 **lib/__tests__/formatters.test.ts** — Add tests for special characters: quotes, unicode (é, ñ), newlines, markdown-breaking chars, SRT-problematic strings

- [ ] 🟠 **lib/__tests__/formatters.test.ts** — Add test for PDF multi-page output. Verify pagination logic with 100+ utterances

- [ ] 🟠 **components/__tests__/DownloadButtons.test.tsx** — Add async test for loading state during PDF generation. Verify buttons disable while toPdf() is executing

- [ ] 🟠 **components/__tests__/DownloadButtons.test.tsx** — Add error handling test. Verify graceful failure if toPdf throws exception

- [ ] 🟠 **components/__tests__/DownloadButtons.test.tsx** — Add test for filename format. Verify `transkrypcja-YYYY-MM-DD.{ext}` ISO date format

- [ ] 🟠 **lib/resend.ts:26-29** — HTML injection risk in email template. Validate APP_URL with `new URL()` before embedding in HTML

### 🟡 P3-Nits (Nice-to-Have)

- [ ] 🟡 **lib/formatters.ts** — Extract PDF magic numbers to named constants (y-position, font sizes, spacing)

- [ ] 🟡 **lib/formatters.ts:16-18** — Document relationship between SRT comma format and srtTimestamp() helper function

- [ ] 🟡 **components/DownloadButtons.tsx:48-55** — Add error boundary to PDF download case (catch jsPDF exceptions)

- [ ] 🟡 **lib/formatters.ts** — Consider branded types for SpeakerId to increase type safety at scale

- [ ] 🟡 **lib/__tests__/formatters.test.ts** — Add performance benchmark suite for 1K+ utterances (marked with describe.skip for CI)

- [ ] 🟡 **lib/formatters.ts** — Add inline comments explaining PDF layout logic (line height vs font size relationships)
