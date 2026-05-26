# Unit 6: Transcript Formatting Utilities — Kontekst

## Stan po Unit 5
Po ukończeniu Unit 5 (DownloadButtons component), mieliśmy przyciski polegające na funkcjach formatowania, które nie istniały. Unit 6 implementuje warstwę formatowania.

## Cele Unit 6
- Eksport transkrypcji w 4 formatach: TXT, SRT, Markdown, PDF
- Narzędzie do konwersji millisekund na HH:MM:SS.mmm
- Funkcje czystej transformacji (pure functions) dla każdego formatu
- Pełne pokrycie testami (happy path + edge cases)

## Decyzje techniczne podjęte

### 1. Lokalizacja: lib/formatters.ts
- Scentralizowana biblioteka formatowania
- Łatwa do importu z komponentów i testów
- Nie zawiera React, czystą logiką biznesową

### 2. Timestamp formatting
```typescript
export function msToTimestamp(ms: number): string {
  // HH:MM:SS.mmm format (3 decimal places for milliseconds)
}
```
- Czas w millisekundach → ciąg tekstowy
- Używany we wszystkich 4 formatach
- Testy sprawdzają edge cases: 0ms, 1ms, >1h

### 3. Formaty eksportu

#### TXT
- Prosty format: timestamp - speaker\ntext\n\n
- Brak specjalnych znaków, najprościej czytalne

#### SRT (SubRip)
- Subtitles format dla narzędzi wideo
- WAŻNE: SRT używa PRZECINKÓW w timestamps (HH:MM:SS,mmm), nie KROPEK
- Numeracja od 1, każdy blok: nr\ntimestamp → timestamp\ntext\n\n
- Helper `srtTimestamp()` konwertuje msToTimestamp dots na commas

#### Markdown
- Strukturalny format z nagłówkami
- H2 dla każdego mówcy: ## Mówca [speaker]\n
- Tekst w paragrafach
- Separator między mówcami: ---

#### PDF
- Client-side generation via jsPDF
- Arial font, 12pt, domyślnie czarny tekst
- Automatyczne wordwrapping na 185pt szerokości
- Automatyczna paginacja gdy text nie mieści się na stronie
- Zwraca Promise<ArrayBuffer> do pobrania

## Zmienione/Utworzone pliki

### lib/formatters.ts (NEW)
- 5 eksportowanych funkcji publicznych
- ~200 linii

### lib/__tests__/formatters.test.ts (NEW)
- 15 testów obejmujących:
  - msToTimestamp: edge cases (0ms, milliseconds, seconds, hours)
  - toTxt: formatting, speaker names
  - toSrt: comma separators, numbering
  - toMarkdown: headers, separators
  - toPdf: ArrayBuffer output, size validation

## Rezultat
- ✅ Wszystkie 15 testów przechodzą
- ✅ Zero TypeScript errors
- ✅ Funkcje dostępne dla DownloadButtons (Unit 5) i aplikacji

## Ostatnia aktualizacja: 2026-05-26
