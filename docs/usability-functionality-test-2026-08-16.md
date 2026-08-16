# Usability and Functionality Test Log

Date: 2026-08-16

## Scope

Focused on the reported failure during Simulator Cart scanning and Tote assignment, then checked the adjacent Cart/Tote workflow, local development startup, optional session lookup, persistence validation, and production build.

## Issue 001: Expected unauthenticated session lookup surfaced as 401

- Severity: Medium, user-visible noise.
- Area: `/api/sessions` optional best-score lookup.
- Reproduction:
  1. Open the Simulator before signing in.
  2. Scenario selection requests `/api/sessions` to load previous best-score badges.
  3. The endpoint returned HTTP 401 even though the badges are optional.
- Impact: Browser network tools show a failed request during Simulator use. This can be mistaken for a Cart/Tote workflow failure.
- Root cause: The scenario selector treated an unauthenticated optional lookup as an error response.
- Fix: Unauthenticated `GET /api/sessions` now returns HTTP 200 with `{}`. Authenticated requests remain user-scoped.
- Verification: Local request returns `200` and `{}`.

## Issue 002: Next 16 local development command failed before Simulator loaded

- Severity: High for local development, not production Vercel builds.
- Area: `npm run dev`.
- Reproduction: Next 16 defaulted to Turbopack while `next.config.mjs` contains a webpack fallback.
- Impact: Local server exited before serving `/sim`.
- Fix: `npm run dev` now uses `next dev --webpack -p 3005`.
- Verification: Local dev server starts successfully; `/sim` returns HTTP 200.

## Cart/Tote Functionality Check

- Cart scan asset mapping: passed.
- Tote scan asset mapping: passed.
- Pick-stage target tote mapping: passed.
- Build Cart `CTRL+E` sequencing: passed.
- Cart/Tote engine transition tests: passed.
- Session persistence canonical scan validation: passed.
- Focused tests: 73/73 passed.

## Current Automated Baseline

- Full test suite: 182/182 passed.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed.
- Production dependency audit: 0 vulnerabilities.

## Browser/Tablet Limitation

A live browser page was not shared with the agent, so authenticated desktop/tablet interaction, screenshots, touch behavior, and real Vercel console verification could not be completed. Static code checks and local HTTP/engine checks passed.

Remaining manual checks:

- Sign in on Vercel Preview.
- Complete Build Cart through all 9 Tote scans.
- Complete one full Pick Round.
- Test wrong Cart/Tote/item and exception recovery.
- Test EN/ES switching.
- Test iPad/tablet portrait and landscape layouts.
- Verify Supervisor CSV download and CoachingFlag resolution.
