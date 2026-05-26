---
date: 2026-05-26
topic: video-transcription
---

# Video Transcription Tool

## Problem
Osobiste narzędzie do konwersji nagrań wideo ze spotkań (Google Meets) na tekst w języku polskim. Pliki do 1GB, czas przetwarzania 5–15 minut — potrzebny feedback o postępie i opcjonalne powiadomienie e-mail gdy gotowe.

## Wymagania

- R1. Użytkownik może wgrać plik wideo do 1GB przez interfejs webowy
- R2. Transkrypcja odbywa się przez AssemblyAI (Universal-3 Pro + Universal-2 fallback) z włączonym speaker diarization, timestamps i automatycznym wykrywaniem języka
- R3. Podczas przetwarzania widoczny jest progress bar z aktualnym statusem (polling AssemblyAI)
- R4. Użytkownik może opcjonalnie podać adres e-mail — dostaje powiadomienie gdy transkrypcja jest gotowa
- R5. Wynik transkrypcji wyświetlany w przeglądarce w formacie: `HH:MM:SS.mmm - Imię Mówcy` + tekst
- R6. Przed downloadem użytkownik może edytować nazwy mówców (podmienić "Speaker A" → imię)
- R7. Download w czterech formatach: TXT, PDF, SRT, Markdown
- R8. Plik wideo nie jest przechowywany po zakończeniu transkrypcji — ephemeral flow przez AssemblyAI upload endpoint
- R9. Aplikacja jest publicznie dostępna pod adresem Vercel (współdzielenie linku do narzędzia, nie do transkrypcji)
- R10. Brak wymaganej rejestracji / logowania

## Kryteria sukcesu

- Użytkownik wgrywa 1GB nagranie Google Meets w języku polskim i otrzymuje czytelną transkrypcję z poprawnie rozpoznanymi zmianami mówcy
- Można pobrać wynik w każdym z 4 formatów
- Aplikacja działa bez wiedzy technicznej (zero konfiguracji dla end-usera)

## Granice scope'u

- Brak persystencji transkrypcji — wyniki istnieją tylko w sesji przeglądarki
- Brak historii uploadów
- Brak link sharingu do konkretnej transkrypcji (tylko link do narzędzia)
- Brak integracji Google Calendar (nazwy mówców edytowane ręcznie)
- Brak auth / user accounts

## Kluczowe decyzje

- **AssemblyAI Universal-3 Pro + Universal-2 fallback**: `speech_models: ["universal-3-pro", "universal-2"]` z `language_detection: true` — automatyczne wykrywanie języka (Polski `pl` wspierany), wyższa dokładność Universal-3 Pro z fallbackiem na Universal-2
- **Ephemeral storage**: plik wideo przez Vercel API route → AssemblyAI upload endpoint — brak Vercel Blob, brak kosztów storage
- **Edytowalne nazwy mówców**: prostsze niż Google Calendar OAuth, wystarczające dla personal use
- **Vercel deploy**: Next.js App Router, auto-deploy z GitHub push

## Zależności / Założenia

- Konto AssemblyAI z aktywnym API key
- AssemblyAI Universal-2 obsługuje język polski natywnie
- E-mail powiadomienia: prawdopodobnie Resend (użytkownik ma już konto i API key)
- Plik wideo to nagranie Google Meets (MP4/WebM)

## Otwarte pytania

### Odroczone do planowania

- [Dotyczy R1][Techniczne] Jak obsłużyć upload 1GB przez Vercel — limit 4.5MB dla API routes; potrzebny presigned URL lub direct upload do AssemblyAI z frontendu (z API key przez server-side proxy)
- [Dotyczy R3][Techniczne] Interwał pollingu statusu AssemblyAI — co ile sekund, jak długo przed timeout
- [Dotyczy R4][Wymaga researchu] Format e-maila z powiadomieniem i treść (czy zawiera preview transkrypcji?)
- [Dotyczy R7][Techniczne] Generowanie PDF po stronie klienta vs serwera

## Następne kroki

→ `/dev-plan` do planowania technicznego implementacji
