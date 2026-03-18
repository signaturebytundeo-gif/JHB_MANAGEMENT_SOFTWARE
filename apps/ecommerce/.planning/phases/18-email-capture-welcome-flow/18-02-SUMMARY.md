---
phase: 18-email-capture-welcome-flow
plan: 02
subsystem: ui
tags: [zustand, persist, exit-intent, footer, email-capture, headlessui, popup]

# Dependency graph
requires:
  - phase: 18-email-capture-welcome-flow-01
    provides: POST /api/subscribe endpoint with validation, dedup, and welcome email
provides:
  - Footer with "Get 10% Off" email subscription form wired to /api/subscribe
  - ExitIntentPopup with mouseleave detection and 7-day dismissal cooldown
  - useSubscribeStore Zustand persist store for shared subscription state
affects: [18-email-capture-welcome-flow-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exit-intent via document mouseleave with clientY < 0 guard (cursor above viewport)"
    - "skipHydration + persist.rehydrate() on mount for SSR-safe Zustand store"
    - "5-second page load guard via readyRef before exit-intent can fire"
    - "Session-scoped hasShownThisSession ref prevents repeated popup per session"
    - "isDismissedRecently() reads localStorage directly for SSR-safe 7-day cooldown check"

key-files:
  created:
    - src/lib/subscribe-store.ts
    - src/components/ExitIntentPopup.tsx
  modified:
    - src/components/layout/Footer.tsx
    - src/app/layout.tsx

key-decisions:
  - "isDismissedRecently reads localStorage directly instead of relying on hydrated Zustand state — avoids race condition where store hasn't hydrated yet when mouseleave fires"
  - "Footer converted to 'use client' — minimal cost since it's below-the-fold; allows store access and form interactivity"
  - "Email subscription form placed above social links in Column 4 — keeps existing 4-column grid structure, reuses Follow Us column real estate"
  - "Auto-close popup 2 seconds after success — gives user time to see confirmation before dialog unmounts"

patterns-established:
  - "useSubscribeStore.persist.rehydrate() in useEffect — consistent with cart-store and sample-store skipHydration pattern"
  - "hasShownThisSession ref (not state) — avoids re-render on assignment, controls one-time popup trigger"

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 18 Plan 02: Email Capture Welcome Flow — Footer Form + Exit-Intent Popup Summary

**Zustand-persisted email capture via footer "Get 10% Off" form and mouseleave exit-intent popup, both POSTing to /api/subscribe with 7-day dismissal cooldown and session dedup**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T19:33:27Z
- **Completed:** 2026-03-18T19:38:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `useSubscribeStore` with Zustand persist middleware — tracks isSubscribed, popupDismissed, dismissedAt across page refreshes via localStorage key `jhb-subscribe-state`
- Converted Footer.tsx to client component with email form in Column 4 (above social links) — inline success/error states, already-subscribed users see checkmark immediately
- Created ExitIntentPopup.tsx with mouseleave detection (clientY < 0), 5-second page load guard, session dedup ref, and 7-day cooldown via isDismissedRecently()
- Wired ExitIntentPopup into root layout.tsx after UpsellModal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create subscribe store and add email form to Footer** - `50ce19a` (feat)
2. **Task 2: Create exit-intent popup and wire into root layout** - `e810016` (feat)

## Files Created/Modified

- `src/lib/subscribe-store.ts` — Zustand store with persist middleware: isSubscribed, popupDismissed, dismissedAt; subscribe() and dismissPopup() actions; isDismissedRecently() helper
- `src/components/ExitIntentPopup.tsx` — Headless UI Dialog popup with mouseleave exit-intent, "Wait! Don't Leave Empty-Handed" copy, 10% gold visual hook, full email form with loading/success/error states
- `src/components/layout/Footer.tsx` — Converted to 'use client', added "Get 10% Off" subscribe form above Follow Us social links, persists subscription state via store
- `src/app/layout.tsx` — Added ExitIntentPopup import and render after UpsellModal

## Decisions Made

- `isDismissedRecently()` reads localStorage directly instead of relying on hydrated Zustand state — avoids race condition where store might not have hydrated before mouseleave fires
- Footer converted to 'use client' at low cost since it is below-the-fold; trade-off is acceptable for interactivity and store access
- Email subscription form placed above social links in Column 4 — preserves exact 4-column grid structure per plan
- Auto-close popup 2 seconds after success to give user confirmation read time before dialog unmounts

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript check passed clean on first run, build succeeded with all new files compiled.

## User Setup Required

None — no external service configuration required for this plan. Both components call the existing /api/subscribe endpoint from Plan 01.

## Next Phase Readiness

- Footer form and exit-intent popup are both live with shared subscription state
- Both touchpoints POST to /api/subscribe — welcome email flow from Plan 01 is triggered on every subscription
- Plan 03 (verification) can confirm end-to-end behavior: subscribe in footer, receive welcome email, popup does not reappear

## Self-Check: PASSED

All files verified:
- src/lib/subscribe-store.ts — exists
- src/components/ExitIntentPopup.tsx — exists
- src/components/layout/Footer.tsx — modified, contains 'use client' and subscribe form
- src/app/layout.tsx — modified, contains ExitIntentPopup
- Commit 50ce19a — verified in git log
- Commit e810016 — verified in git log
- Build passes with 0 TypeScript errors

---
*Phase: 18-email-capture-welcome-flow*
*Completed: 2026-03-18*
