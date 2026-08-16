# Current WarehousePro Application Audit

Date: 2026-08-16

## Verdict

**Status: production-capable infrastructure, but not ready for formal floor-ready certification.**

The current codebase is materially healthier than the previous audit:

- 182/182 tests pass across 19 test files.
- `npm run lint` passes with no errors.
- `npx tsc --noEmit` passes.
- `npm run build` succeeds on Next 16.3.1 using webpack.
- `npm audit --omit=dev` reports 0 vulnerabilities.

The remaining blockers are data authenticity, legacy authorization cleanup, authored training content, migration deployment verification, and browser/tablet UAT.

## Findings

### Critical: session events can still be fabricated by the client

**Update (2026-08-16): remediated for canonical scan authenticity.** Completed sessions now require nine successful Build Cart tote scans, canonical item/tote/cart/zone values, Pick-by-Pick item coverage, and exception coverage for skipped Picks. Fabricated successful barcodes are rejected by the persistence parser and covered by regression tests. A full database-backed end-to-end test remains recommended.

Files:
- `src/services/session-persistence.ts`
- `src/app/api/sessions/route.ts`

The API now validates event shape and recomputes metrics from submitted events, but it does not validate that the event sequence is the canonical workflow sequence or that scanned values match the expected cart, tote, item, zone, and target Pick. A malicious client can submit a fabricated set of successful `PK_SCAN_TOTE_BARCODE` events and matching metrics, receive a valid persisted score, and affect floor-readiness reporting.

Required remediation:
1. Persist a server-issued simulation nonce/session start record.
2. Accept canonical actions rather than arbitrary final event arrays, or validate every event against the server-owned state machine and scenario data.
3. Verify event order, expected values, target tote slots, Pick count, exception routes, and completion state server-side.
4. Add an integration test that submits fabricated successful events and proves the request is rejected.

### High: legacy notification endpoint bypasses Lead assignment scope

**Update (2026-08-16): remediated.** The obsolete `/api/notifications` endpoint was removed; the durable CoachingFlag API is now the only dashboard flag workflow.

File: `src/app/api/notifications/route.ts`

The active CoachingFlag UI uses `/api/coaching-flags`, which correctly scopes Pick Leads to assigned trainees. However, the legacy `/api/notifications` endpoint remains publicly routable to any authenticated Pick Lead and checks only that the target trainee exists before notifying a facility Supervisor. It does not verify the target trainee is assigned to the calling Lead or even that the target trainee is in the Lead's facility.

The CoachingFlag route retains facility and assigned-trainee checks with route tests.

### High: CoachingFlag duplicate creation is not race-safe

**Update (2026-08-16): remediated.** Added a PostgreSQL partial unique index for open `(traineeId, category)` flags and `P2002` conflict handling, with a regression test.

Files:
- `src/app/api/coaching-flags/route.ts`
- `prisma/schema.prisma`

The create route performs a `findFirst` duplicate check followed by `create`, but there is no database uniqueness constraint for one open flag per trainee/category. Concurrent requests can create duplicate open flags.

Migration: `prisma/migrations/20260816143000_unique_open_coaching_flag/migration.sql`.

### High: authored content gate still fails

Command: `npm run content:validate`

The validator correctly fails because these directories contain no authored files:

- `content/labs`
- `content/simulations`
- `content/questions`
- `content/directives`

The scenario seed data and coaching maps are not a replacement for versioned, schema-validated pilot content. Do not fabricate SOP directives; approved GEODIS content is required.

Release implication: the application cannot pass the content release gate until pilot labs, simulations, question banks, and directives are authored and validated.

### High: migration deployment state is unverified

**Update (2026-08-16): deployment contract added; staging execution still required.** Added `prisma/migrations/migration_lock.toml`, `npm run db:migrate:deploy`, and migration contract tests. `DATABASE_URL` is unavailable in this environment, so staging application remains unverified.

Files:
- `prisma/schema.prisma`
- `prisma/migrations/20260816131500_unique_floor_ready_signoff/migration.sql`
- `prisma/migrations/20260816132500_add_coaching_flags/migration.sql`

`prisma validate` and `prisma migrate status` cannot run in this environment because `DATABASE_URL` is unavailable. The build regenerates Prisma Client, but it does not prove that production migrations have been applied.

Required staging verification:
1. Run `prisma migrate deploy` against a staging database.
2. Verify both migrations on a clean database and a database containing representative existing data.
3. Test unique signoff creation, CoachingFlag relations, rollback/restore, and backup recovery.
4. Add migration deployment to the release runbook and CI/staging gate.

### Medium: proxy role source can disagree with server authorization

File: `src/proxy.ts`

The Next 16 proxy uses Supabase `user_metadata.role` for early redirects, while server pages and APIs use the DB-backed role from `requireRole`. This is acceptable as navigation defense in depth only, but stale or forged metadata can cause inconsistent redirects. Server-side checks remain authoritative and must be retained.

Recommended remediation: use proxy only for authentication/early navigation and explicitly document that role authorization is server-side. If operationally required, add a trusted role claim or edge-readable role source.

### Medium: API integration coverage remains incomplete

The 178 tests are strong for pure engine, reporting, schema, and selected route behavior, but there is no live database integration suite for:

- Session transaction/idempotency behavior.
- Server-side event authenticity.
- Prisma migration application.
- CSV route authorization and response headers.
- CoachingFlag duplicate races.
- Signoff uniqueness under concurrent requests.

Recommended remediation: add staging-backed route integration tests before pilot approval.

### Medium: browser/tablet UAT remains unexecuted

No browser page was shared for this audit, so these remain unverified:

- Build Cart and full Round completion on tablet dimensions.
- EN/ES switching across all trainee-facing surfaces.
- 3D scan target/touch fallback behavior.
- Compact layout overflow and `100dvh` behavior.
- Supervisor coaching queue on tablet.
- CSV download through an authenticated browser session.

### Low: remaining non-security warnings and maintenance

- Next 16 build uses explicit `--webpack` because the project has custom webpack fallback configuration.
- Browserslist data is stale and should be updated during routine maintenance.
- The Next 16 migration introduced flat ESLint config with two intentional React-rule overrides; those overrides should be revisited during a React/compiler cleanup.

## Strengths

- Zero production dependency vulnerabilities.
- Stable Next 16.3.1 production build.
- Strong pure simulation engine and scoring coverage.
- Server-side readiness signoff enforcement with database uniqueness.
- Facility/assignment-scoped reporting and CoachingFlag APIs.
- Canonical Supervisor/Lead/Manager reporting services.
- Formula-safe Supervisor CSV export.
- Executable scenario contract: all five scenarios pass.
- Content validator and schema artifacts are in place.

## Release Gates

Before formal pilot certification:

1. Reject fabricated session event sequences server-side.
2. Remove or secure the legacy notification endpoint.
3. Make CoachingFlag duplicate prevention database-safe.
4. Apply and verify Prisma migrations in staging.
5. Add approved content to all four content directories and make `npm run content:validate` pass.
6. Complete authenticated Playwright desktop/tablet journeys.
7. Reconcile persisted sessions and dashboard metrics against hand-calculated fixtures.

## Recommended Next Order

1. Apply and verify migrations against staging; this requires `DATABASE_URL`.
2. Add approved pilot content and make `npm run content:validate` pass.
3. Complete authenticated browser/tablet UAT with shared staging access.
