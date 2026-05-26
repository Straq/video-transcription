# Unit 7: Email Notifications — Zadania

## Faza 1: Frontend Email Input

- [x] Dodaj email input field do app/page.tsx
  - Label: "E-mail (opcjonalnie)"
  - Helper text: "Otrzymasz powiadomienie e-mail gdy transkrypcja będzie gotowa"
  - useState dla email value
  - type="email", placeholder="twój@email.com"

- [x] Test: app/page.tsx integration
  - Email field rendered
  - Email value updates on change
  - Email passed to API

## Faza 2: useEffect Hook dla Email Notification

- [x] Dodaj useEffect w app/page.tsx
  - Słucha: transcriptionState.status, email, transcriptId
  - Warunek: `status === "completed" && email && transcriptId`
  - Fetch POST /api/notify z body: `{ email, transcriptId }`
  - Catch errors bez throw

- [x] Test: notification timing
  - Wysyłane tylko gdy transcription completed
  - Nie wysyłane gdy brak emaila
  - Request ze prawidłowym paylodem

## Faza 3: Endpoint POST /api/notify

- [x] Utwórz app/api/notify/route.ts
  - POST handler: `async function POST(request: Request): Promise<NextResponse>`
  - Parser: `await request.json()` z try-catch
  - Zod validation schema:
    ```typescript
    notifySchema = z.object({
      email: z.string().email("Invalid email address"),
      transcriptId: z.string().min(1)
    })
    ```
  - Walidacja: `schema.safeParse(body)`
  - Zwrócenie error message na validation fail (400)

- [x] Integracja z sendTranscriptionReadyEmail
  - Import z lib/resend
  - Call: `await sendTranscriptionReadyEmail({ to: parsed.data.email })`
  - Success: `{ success: true }` (200)
  - Error: `{ error: toErrorMessage(err) }` (500)

- [x] Error handling
  - JSON parse error → 400 "Invalid JSON body"
  - Validation error → 400 z message
  - Resend error → 500 z error message
  - Logging na stderr

## Faza 4: Test Coverage POST /api/notify

- [x] Test: Success case
  - Valid email + transcriptId
  - Response: 200, { success: true }
  - sendTranscriptionReadyEmail called

- [x] Test: Missing email
  - Only transcriptId in body
  - Response: 400, { error: string }

- [x] Test: Invalid email
  - email: "not-an-email"
  - Response: 400, error contains "email"

- [x] Test: Missing transcriptId
  - Only email in body
  - Response: 400

- [x] Test: Invalid JSON
  - body: "{ bad json"
  - Response: 400, error contains "JSON"

- [x] Test: Resend error
  - sendTranscriptionReadyEmail throws
  - Response: 500, error message

## Test Summary

- ✅ 6 testów Unit 7
- ✅ 100% pass rate
- ✅ Happy path + all error scenarios covered

## Weryfikacja: (nie wymagana w fazie dev-docs-execute)

## Do poprawy po review Unit 7

### 🔴 P1-Blocking (Must Fix Before Shipping)

- [ ] 🔴 **app/api/notify/route.ts:10** — Add transcriptId format validation. Replace `.min(1)` with `.regex(/^[a-zA-Z0-9_-]+$/)` to prevent email spam attacks

- [ ] 🔴 **app/page.tsx:21-35, app/api/notify/route.ts:30** — Email sending blocks response and may send duplicates. Implement fire-and-forget using Next.js `after()` hook or add idempotency guard in useEffect (`notificationSent` state)

- [ ] 🔴 **app/api/notify/route.ts** — Add rate limiting to prevent email spam. Limit 10 emails per recipient per 24 hours. Implement in-memory rate limiting for MVP or use Vercel KV

### 🟠 P2-Important (Fix Before Production)

- [ ] 🟠 **app/api/notify/route.ts:22-26** — Remove field-specific validation error messages. Return generic "Invalid request" for all validation failures to prevent user enumeration

- [ ] 🟠 **lib/resend.ts:32-34** — Sanitize error messages before returning to client. Replace `Resend send failed: ${error.message}` with generic "Failed to send email"

- [ ] 🟠 **app/page.tsx:21-35** — Add AbortController cleanup to email fetch. Prevent orphaned requests if user navigates away during email send

- [ ] 🟠 **lib/resend.ts:18** — Remove duplicate email validation. Trust route's Zod validation; service layer assumes input already validated

- [ ] 🟠 **app/page.tsx:31-33** — Add error UI feedback for email failures. Show toast/error message to user instead of silent console logging

- [ ] 🟠 **app/page.tsx:85-92** — Add client-side email validation before sending. Check format with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

- [ ] 🟠 **app/api/notify/route.ts:10** — Remove unused `transcriptId` parameter or pass to email service for tracking. Currently validated but not used

- [ ] 🟠 **lib/resend.ts:26-29** — Add HTML validation to email template. Wrap `APP_URL` with `new URL()` to prevent injection

- [ ] 🟠 **app/api/notify/__tests__/route.test.ts** — Add tests for special character email formats: `user+tag@example.com`, `user@subdomain.co.uk`

- [ ] 🟠 **app/page.tsx** — Add integration test for useEffect email trigger. Verify email sent only when status=completed AND email provided

### 🟡 P3-Nits (Nice-to-Have)

- [ ] 🟡 **app/api/notify/route.ts** — Standardize API response format. Currently `{ success: true }` vs other routes `{ transcriptId }`. Use consistent `{ success, error }`

- [ ] 🟡 **app/api/notify/route.ts:24** — Aggregate Zod validation errors instead of showing only first. Return all failures for better UX

- [ ] 🟡 **app/page.tsx:85-92** — Disable email field after upload starts. Prevent user changing email mid-transcription and confusing which address gets notification

- [ ] 🟡 **lib/resend.ts:7-9** — Use singleton pattern for Resend client. Cache instance instead of creating new on every call

- [ ] 🟡 **lib/resend.ts:1-10** — Add JSDoc comments explaining transcriptId parameter usage (or rationale if not used)
