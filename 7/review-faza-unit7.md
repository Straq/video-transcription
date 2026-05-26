# Unit 7 Code Review — Email Notifications

**Date**: 2026-05-26  
**Reviewers**: Security Sentinel, Performance Oracle, Architecture Strategist, Test Coverage Analyzer  
**Files Reviewed**: 
- app/api/notify/route.ts (40 lines)
- app/api/notify/__tests__/route.test.ts (89 lines, 6 tests)
- app/page.tsx (useEffect hook, lines 21-35)
- lib/resend.ts (sendTranscriptionReadyEmail function)

---

## Executive Summary

**Status**: ⚠️ **READY FOR MERGE with 3 P1 critical security/performance fixes required**

Unit 7 (Email Notifications) is **architecturally sound and passes functional tests**, but has **3 P1 blocking security/performance issues and 10 P2 important gaps** that must be addressed before production deployment.

**Critical Findings**:
- Missing input validation allowing email spam attacks
- Email requests block UI and can send duplicates
- No rate limiting on public endpoint
- Silent error handling hides failures from users

**Key Strength**: Clean architecture with proper server-only patterns and type safety.

---

## Severity Breakdown

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 P1-Blocking | 3 | **Must fix before shipping** |
| 🟠 P2-Important | 10 | **Fix before production** |
| 🟡 [P3-Nit | 5 | **Nice-to-have improvements** |
| ✅ Passed | 10+ | **Strong in architecture** |

---

## 🔴 P1-Blocking Issues

### 1. **Missing transcriptId Format Validation**
**Files**: `app/api/notify/route.ts:10`

**Issue**: The `/api/notify` endpoint accepts `transcriptId` with only `.min(1)` validation, allowing ANY non-empty string:

```typescript
transcriptId: z.string().min(1),  // ← UNSAFE: allows garbage values
```

Compare to `/api/transcribe/[id]` which correctly validates: `/^[a-zA-Z0-9_-]+$/`

**Impact**: Email spam attack vector. Attacker can trigger emails to valid addresses with arbitrary `transcriptId` values without restriction. No deduplication prevents duplicate sends.

**Remediation**:
```typescript
const notifySchema = z.object({
  email: z.string().email("Invalid email address"),
  transcriptId: z.string().regex(/^[a-zA-Z0-9_-]+$/, "Invalid transcript ID"),
});
```

---

### 2. **Email Sending Blocks API Response and May Send Duplicates**
**Files**: `app/page.tsx:21-35`, `app/api/notify/route.ts:30`

**Issue**: The email is sent synchronously (`.await sendTranscriptionReadyEmail()`) which:
1. Blocks the HTTP response if Resend API hangs (30-60s timeouts possible)
2. Frontend useEffect fires on every `transcriptionState.status` change, potentially sending duplicate emails
3. No idempotency key prevents `(email, transcriptId)` from being sent twice

**Impact**: 
- **At scale**: API timeouts, high failure rate
- **User experience**: Duplicate emails on re-renders, UI freezes waiting for email response
- **Infrastructure**: Resend quota exhaustion

**Remediation**:
Option A (Next.js 15+ with `after()` hook):
```typescript
import { after } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  // ... validation ...
  
  after(async () => {
    try {
      await sendTranscriptionReadyEmail({ to: parsed.data.email });
    } catch (err) {
      console.error("Email send failed:", err);
    }
  });
  
  return NextResponse.json({ success: true });
}
```

Option B (Frontend idempotency guard):
```typescript
const [notificationSent, setNotificationSent] = useState(false);

useEffect(() => {
  if (
    transcriptionState.status === "completed" &&
    email &&
    transcriptId &&
    !notificationSent
  ) {
    setNotificationSent(true);
    fetch("/api/notify", { ... }).catch(() => {
      setNotificationSent(false); // Reset on failure for retry
    });
  }
}, [transcriptionState.status, email, transcriptId, notificationSent]);
```

---

### 3. **No Rate Limiting on Public Email Endpoint**
**Files**: `app/api/notify/route.ts` (entire file)

**Issue**: The `/api/notify` endpoint has **zero rate limiting**. An attacker can:
- Spam any email address with hundreds/thousands of notification emails
- Exhaust Resend email quota
- Damage domain reputation (emails marked as spam)

**Proof of Concept**:
```bash
for i in {1..1000}; do
  curl -X POST http://localhost:3000/api/notify \
    -H "Content-Type: application/json" \
    -d '{"email":"victim@example.com","transcriptId":"abc123"}'
done
```

**Remediation**: Implement rate limiting:
- Per-email limit: 10 emails per recipient per day
- Per-IP limit: 50 emails per IP per day
- Per-transcriptId: 1 email per transcriptId (idempotency)

```typescript
// Simple in-memory rate limiting for MVP
const emailSendCounts = new Map<string, number[]>();
const RATE_LIMIT_PER_EMAIL = 10;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const timestamps = emailSendCounts.get(email) || [];
  const recentSends = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentSends.length >= RATE_LIMIT_PER_EMAIL) {
    return false;
  }
  
  recentSends.push(now);
  emailSendCounts.set(email, recentSends);
  return true;
}
```

For production, use Vercel KV or Redis.

---

## 🟠 P2-Important Issues

### 1. **User Enumeration via Specific Validation Error Messages**
**Files**: `app/api/notify/route.ts:22-26`

**Issue**: The endpoint returns field-specific error messages:
```typescript
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.issues[0]?.message ?? "Invalid request" },  // ← Reveals which field failed
    { status: 400 }
  );
}
```

An attacker can infer whether an email exists/is valid by analyzing error messages:
- Email error → caller provided invalid email format
- transcriptId error → email was valid

**Remediation**: Return generic error for all validation failures:
```typescript
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
```

---

### 2. **Email Address Logging Risk in Error Messages**
**Files**: `lib/resend.ts:32-34`

**Issue**: If Resend API fails, the error is passed through to the client:
```typescript
throw new Error(`Resend send failed: ${error.message}`);
```

If Resend's error message contains the email address (unlikely but possible), it leaks PII.

**Remediation**: Sanitize error before returning:
```typescript
if (error) {
  console.error("Resend error:", error);
  throw new Error("Failed to send email");  // Generic message
}
```

---

### 3. **No useEffect Cleanup (AbortController) for Email Fetch**
**Files**: `app/page.tsx:21-35`

**Issue**: The fetch request has no AbortController. If user navigates away during email send, the request completes in the background:

```typescript
useEffect(() => {
  if (transcriptionState.status === "completed" && email && transcriptId) {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, transcriptId }),
    }).catch((err) => {
      console.error("Failed to send notification:", err);
    });
  }
}, [transcriptionState.status, email, transcriptId]);
```

**Impact**: Memory leaks, orphaned requests, unhandled promise rejections.

**Remediation**:
```typescript
useEffect(() => {
  if (transcriptionState.status === "completed" && email && transcriptId) {
    const controller = new AbortController();
    
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, transcriptId }),
      signal: controller.signal,
    }).catch((err) => {
      if (err.name !== "AbortError") {
        console.error("Failed to send notification:", err);
      }
    });
    
    return () => controller.abort();
  }
}, [transcriptionState.status, email, transcriptId]);
```

---

### 4. **Duplicate Email Validation (Zod in Route + Service Layer)**
**Files**: `app/api/notify/route.ts:9`, `lib/resend.ts:18`

**Issue**: Email validation happens twice:
1. Route schema: `.email("Invalid email address")`
2. Resend service: `.email("Invalid recipient email address").parse(...)`

**Remediation**: Remove validation from `sendTranscriptionReadyEmail`:
```typescript
// lib/resend.ts — trust route has already validated
export async function sendTranscriptionReadyEmail(params: { to: string }): Promise<void> {
  const result = await resendClient.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,  // Already validated by route
    subject: "Transkrypcja gotowa",
    html: `<p>Transkrypcja jest gotowa. <a href="${env.APP_URL}">Wróć do narzędzia</a></p>`,
  });
  
  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
}
```

---

### 5. **Silent Error Handling Hides Failures from Users**
**Files**: `app/page.tsx:31-33`

**Issue**: Email send errors are only logged to console, user gets no feedback:
```typescript
.catch((err) => {
  console.error("Failed to send notification:", err);  // ← User never sees this
});
```

If email fails, user doesn't know and can't retry.

**Remediation**: Show error in UI or retry automatically:
```typescript
const [emailError, setEmailError] = useState<string | null>(null);

useEffect(() => {
  if (transcriptionState.status === "completed" && email && transcriptId && !notificationSent) {
    setNotificationSent(true);
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, transcriptId }),
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) {
          setEmailError("Failed to send notification email");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setEmailError("Failed to send notification email");
        }
      });
  }
}, [...]);

// In JSX:
{emailError && (
  <div role="alert" className="text-destructive">
    {emailError}
  </div>
)}
```

---

### 6. **No Client-Side Email Validation**
**Files**: `app/page.tsx:85-92`

**Issue**: Email input uses `type="email"` for browser validation, but the value is sent to API without JavaScript validation:

```typescript
<input
  id="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="twój@email.com"
  className="..."
/>
```

Browser validation doesn't fire until form submit; no validation before sending.

**Remediation**: Add client-side validation before sending:
```typescript
const isValidEmail = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Before fetch:
if (!isValidEmail) {
  setEmailError("Please enter a valid email address");
  return;
}
```

---

### 7. **Unused `transcriptId` Parameter in Email Logic**
**Files**: `app/api/notify/route.ts:10`, `app/api/notify/route.ts:30`

**Issue**: `transcriptId` is validated in the schema but never used in the email sending:

```typescript
const notifySchema = z.object({
  email: z.string().email("Invalid email address"),
  transcriptId: z.string().min(1),  // ← Validated but not used
});

// Later:
await sendTranscriptionReadyEmail({ to: parsed.data.email });  // ← transcriptId ignored
```

**Remediation**: Either pass it to the email service for tracking, or remove it from the schema:
```typescript
// Option 1: Use it
await sendTranscriptionReadyEmail({
  to: parsed.data.email,
  transcriptId: parsed.data.transcriptId,
});

// Option 2: Remove it
const notifySchema = z.object({
  email: z.string().email("Invalid email address"),
});
```

---

### 8. **Missing HTML Injection Protection in Email Template**
**Files**: `lib/resend.ts:26-29`

**Issue**: `APP_URL` is concatenated directly into HTML without validation:

```typescript
html: `<p><a href="${env.APP_URL}">Wróć do narzędzia</a></p>`,
```

If `APP_URL` is misconfigured (e.g., `javascript:alert(1)`), it could execute malicious code.

**Remediation**:
```typescript
const url = new URL(env.APP_URL); // Validates URL structure
const html = `<p><a href="${url.toString()}">Wróć do narzędzia</a></p>`;
```

---

### 9. **Test Coverage Gap: Special Character Emails**
**Files**: `app/api/notify/__tests__/route.test.ts` (missing tests)

**Issue**: Tests only use simple email formats (`user@example.com`, `not-an-email`). Real emails can have:
- Plus addressing: `user+tag@example.com`
- Subdomains: `user@mail.example.co.uk`
- Escaped characters: quoted-string format

**Remediation**: Add test cases:
```typescript
it("should accept email with plus addressing", async () => {
  const response = await makeRequest({
    email: "user+transcription@example.com",
    transcriptId: "t-123",
  });
  expect(response.status).toBe(200);
});

it("should accept email with subdomain", async () => {
  const response = await makeRequest({
    email: "user@mail.example.co.uk",
    transcriptId: "t-123",
  });
  expect(response.status).toBe(200);
});
```

---

### 10. **Test Coverage Gap: No useEffect Integration Test**
**Files**: `app/page.tsx` (no integration test for email trigger)

**Issue**: The useEffect that triggers email notification is never tested in isolation. Tests verify:
- API route works ✅
- Zod validation works ✅
- But: frontend integration untested ❌

**Remediation**: Add integration test for app/page.tsx:
```typescript
it("should send email notification when transcription completes", async () => {
  const { rerender } = render(<Home />);
  
  // User enters email
  const emailInput = screen.getByPlaceholderText("twój@email.com");
  await userEvent.type(emailInput, "user@example.com");
  
  // Transcription completes
  rerender(<Home />); // With transcriptionState.status === "completed"
  
  // Should call /api/notify
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      "/api/notify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          transcriptId: expect.any(String),
        }),
      })
    );
  });
});
```

---

## 🟡 P3-Nits

1. **Inconsistent API Response Formats** (`{ success: true }` vs `{ transcriptId }` in other routes) — standardize to `{ success, error }`
2. **Zod Error Extraction Returns Only First Issue** — should aggregate all validation errors for better user feedback
3. **Email Field Not Disabled After Upload** — user can change email mid-transcription; field should be locked
4. **Resend Client Instantiated on Every Call** — should use singleton pattern for efficiency
5. **Missing JSDoc Comments** — document why `transcriptId` is accepted but not used

---

## ✅ What Passed (Strengths)

✅ **No hardcoded secrets** — RESEND_API_KEY properly isolated in env.ts with "server-only" directive  
✅ **Proper server-only boundaries** — @/lib/resend correctly marked with "server-only" import guard  
✅ **Type safety** — No `any` types; Zod validation enforced at API boundary  
✅ **Clean architecture** — Route → Service → External API (proper layering)  
✅ **Error handling strategy** — Catches JSON parse errors, validates before service call, returns appropriate HTTP codes  
✅ **Test organization** — Happy path tested, validation scenarios covered, error cases tested  
✅ **No circular dependencies** — Proper import direction (route → service → lib)  
✅ **Consistent with project patterns** — Matches /api/transcribe structure  
✅ **API key not exposed in client** — environment variables properly isolated  

---

## Consolidation Summary

### By Category

**🔴 P1-Blocking (Must Fix)**
1. Missing transcriptId format validation (spam vector)
2. Email sending blocks response and may duplicate (performance, UX)
3. No rate limiting on public endpoint (spam, quota exhaustion)

**🟠 P2-Important (Fix Before Production)**
1. User enumeration via error messages
2. Email address logging risk
3. No AbortController cleanup
4. Duplicate email validation
5. Silent error handling
6. No client-side email validation
7. Unused transcriptId parameter
8. HTML injection in email template
9. Missing special character email tests
10. No useEffect integration test

**🟡 P3-Nits**
1-5. Response format consistency, error aggregation, field disabling, client singleton, documentation

---

## Recommendation

### Ship or Hold?

**Status**: ⚠️ **HOLD until P1 issues fixed**

Unit 7 is **architecturally excellent but has critical security/performance flaws**. The three P1 issues create:
- **Security vectors**: Email spam, rate limiting abuse
- **Performance issues**: API response blocking, duplicate sends
- **UX problems**: Silent failures, no user feedback

**Next Steps**:
1. ✅ Fix P1: Add transcriptId validation (5 min)
2. ✅ Fix P1: Implement email fire-and-forget pattern (15 min)
3. ✅ Fix P1: Add rate limiting (20 min)
4. ✅ Fix P2: Add AbortController cleanup (10 min)
5. ✅ Fix P2: Show error UI feedback (15 min)
6. ✅ Fix P2: Remove duplicate validation (5 min)
7. ⏭️ Fix P2/P3: Add tests for edge cases (20 min)

**Estimated time to P1 fixes**: 40 minutes  
**Estimated time to P1 + P2 fixes**: 90 minutes

---

## Implementation Checklist

```markdown
### P1 (Before Shipping)
- [ ] Add transcriptId regex validation: `/^[a-zA-Z0-9_-]+$/`
- [ ] Add rate limiting: 10 emails per recipient per 24h
- [ ] Implement fire-and-forget with `after()` hook or idempotency guard
- [ ] Add AbortController cleanup to useEffect
- [ ] Remove generic error message for all validation failures

### P2 (Before Production)
- [ ] Add error UI feedback (show failed email notifications to user)
- [ ] Remove duplicate email validation from resend.ts
- [ ] Add HTML validation to email template (new URL())
- [ ] Add special character email format tests
- [ ] Add useEffect integration test

### P3 (Nice-to-Have)
- [ ] Standardize API response format across all routes
- [ ] Aggregate Zod validation errors instead of first-only
- [ ] Disable email field after upload starts
- [ ] Use singleton for Resend client instance
- [ ] Add JSDoc comments for transcriptId parameter
```

---

**Review Completed**: 2026-05-26 15:30 UTC
