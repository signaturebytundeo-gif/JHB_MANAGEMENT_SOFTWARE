---
phase: 18-email-capture-welcome-flow
plan: 01
subsystem: api
tags: [resend, react-email, email, subscribe, mailchimp, welcome]

# Dependency graph
requires:
  - phase: 17-discount-codes
    provides: WELCOME10 Stripe promo code used in welcome email CTA
  - phase: 05-seo-performance
    provides: mailchimp-sync.ts used for subscriber syncing
provides:
  - POST /api/subscribe endpoint with email validation and dedup
  - WelcomeEmail React Email component with JHB brand aesthetic
  - sendWelcomeEmail helper with dev fallback
affects: [18-email-capture-welcome-flow-02, 18-email-capture-welcome-flow-03]

# Tech tracking
tech-stack:
  added: [resend@6.9.2, "@react-email/render@2.0.4"]
  patterns: [lazy Resend client init, module-level Set dedup, dev console fallback, non-blocking Mailchimp sync in try/catch]

key-files:
  created:
    - src/lib/email-templates/WelcomeEmail.tsx
    - src/lib/emails/send-welcome.ts
    - src/app/api/subscribe/route.ts
  modified:
    - package.json

key-decisions:
  - "Module-level Set for server-side dedup — lightweight guard within server lifecycle, client localStorage prevents re-submission"
  - "Dev fallback in sendWelcomeEmail logs to console when RESEND_API_KEY absent — subscribe flow works locally without Resend credentials"
  - "Mailchimp sync wrapped in try/catch and non-blocking — Mailchimp failure must not prevent subscriber from receiving welcome email"
  - "Email removed from dedup Set on sendWelcomeEmail failure — allows retry on transient Resend errors"
  - "Tags 'jhb-subscriber' and 'email-capture' distinguish newsletter subscribers from purchase-triggered Mailchimp syncs"

patterns-established:
  - "Lazy Resend client: module-level null var initialized on first call via getResendClient() getter — same pattern as command-center"
  - "Dev fallback pattern: check process.env.RESEND_API_KEY at top of send function, console.log email details, return { success: true }"
  - "Email API route pattern: validate + normalize + dedup + send + non-blocking side-effects + structured JSON response"

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 18 Plan 01: Email Capture Welcome Flow — Subscribe API + Email Infrastructure Summary

**Resend-powered POST /api/subscribe with email validation, server-side dedup Set, WELCOME10 welcome email via React Email template, and non-blocking Mailchimp sync**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T16:36:26Z
- **Completed:** 2026-03-18T19:24:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed resend@6.9.2 and @react-email/render@2.0.4 in ecommerce app
- Created WelcomeEmail.tsx with full JHB brand aesthetic (dark #1A1A1A header, gold #D4A843 monogram circle, cream #FAF8F5 body, dark green #2D5016 footer, Plus Jakarta Sans font) — all inline styles for email client compatibility
- Created POST /api/subscribe with email validation, module-level Set dedup, Resend send, and non-blocking Mailchimp audience sync

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Resend + React Email and create welcome email template** - `0722bbd` (feat)
2. **Task 2: Create POST /api/subscribe endpoint** - `42b13c2` (feat)

## Files Created/Modified

- `src/lib/email-templates/WelcomeEmail.tsx` - React Email template with JHB brand: dark header, gold WELCOME10 code box, Shop Now CTA, green footer
- `src/lib/emails/send-welcome.ts` - Lazy Resend client, dev console fallback, renders WelcomeEmail and sends via Resend
- `src/app/api/subscribe/route.ts` - POST handler: validates + normalizes email, deduplicates with module-level Set, calls sendWelcomeEmail, syncs to Mailchimp
- `package.json` - Added resend@^6.9.2 and @react-email/render@^2.0.4

## Decisions Made

- Module-level `Set<string>` for server-side dedup — persists within server lifecycle; client localStorage is the primary guard
- Dev fallback in `sendWelcomeEmail` console-logs when `RESEND_API_KEY` is absent so local development works without Resend credentials
- Mailchimp sync in `try/catch` — failure is logged as warning but never blocks the subscribe response
- Email removed from dedup Set on `sendWelcomeEmail` failure to allow retries on transient errors
- Tags `jhb-subscriber` and `email-capture` added to Mailchimp sync to distinguish newsletter subscribers from purchase customers

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript check passed clean on first run, build succeeded with all 3 new files compiled.

## User Setup Required

To enable live welcome emails, add `RESEND_API_KEY` to `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

Without this key, the subscribe endpoint works in dev mode (console.log fallback, returns `{ success: true }`).

## Next Phase Readiness

- POST /api/subscribe is live and ready to accept requests from the footer form and exit-intent popup (Plan 02)
- WelcomeEmail template is production-ready pending Resend API key configuration
- WELCOME10 promo code from Phase 17 is referenced in the email CTA pointing to /shop

## Self-Check: PASSED

All files exist and commits verified.

---
*Phase: 18-email-capture-welcome-flow*
*Completed: 2026-03-18*
