# WarehousePro Application Evaluation

> Superseded by [docs/app-evaluation-2026-08-16-current.md](docs/app-evaluation-2026-08-16-current.md), which reflects the post-Next 16 audit.

Date: 2026-08-16

## Overall Assessment

**Status: strong engineering prototype; not yet production-ready for training signoff.**

The pure simulation engine, scoring logic, and floor-readiness calculations have good unit coverage. The app compiles and builds successfully. The largest risks are now data integrity, scenario compliance, dependency security, content governance, and unverified tablet behavior.

## Validation Results

- Spanish coaching: 46/46 English coaching steps have Spanish equivalents.
- Full tests: 8 files, 144 tests passed.
- TypeScript: `npx tsc --noEmit` passed.
- Production build: passed; 20 routes generated.
- Dependency audit: 4 high-severity production findings.
- Browser validation: not completed because no browser page was shared with the agent. Static responsive review was completed.

## Findings

### Critical - Persisted training data is not trustworthy

**Update (2026-08-16): substantially remediated.** Session submissions now bind to server-owned scenarios, validate canonical events, recompute reporting metrics server-side, and persist `scanEvents`, `errors`, and replay data atomically. Database-backed route integration tests remain to be added.

Files:
- `src/hooks/useSimulation.ts`
- `src/app/api/sessions/route.ts`
- `src/lib/floorReadiness.ts`

The session API trusts client-provided scores, pass status, duration, and exception counts. A caller can submit arbitrary values without server-side scenario validation or score recomputation.

The client sends scan replay data and exception summaries, but the API stores only `replayEvents`. It does not populate `SimSession.scanEvents` or `SimSession.errors`. Floor-readiness analysis reads `scanEvents` and `errors`, so real sessions will not contribute correct exception coverage or resolution statistics.

Recommended action:
1. Accept canonical action/scan events plus a scenario ID.
2. Validate the scenario server-side and recompute score/pass status.
3. Persist `scanEvents`, `errors`, and replay data in the fields consumed by analytics.
4. Add API integration tests for forged scores, malformed events, and exception coverage.

### High - Best score can decrease after a later attempt

**Update (2026-08-16): remediated.** Progress updates now preserve the maximum historical score, sticky completion, accumulated time, and idempotent attempt counts inside the session transaction.

File: `src/app/api/sessions/route.ts`

The upsert sets `bestScore` to the latest score before the conditional max update. The subsequent `updateMany` cannot restore the previous higher value because it has already been overwritten.

Recommended action: read/update transactionally or use a database expression that preserves `max(existing, incoming)`.

### High - Four scenarios violate simulation content rules

**Update (2026-08-16): remediated.** All five canonical scenarios now pass an executable contract requiring at least 10 Picks, exactly 9 totes, and at least two distinct in-range injected errors with expected resolution paths. The beginner scenario is now `Z1_10_PICKS`.

File: `src/data/seedData.ts`

Measured active error injections:

| Scenario | Picks | Active injected errors |
|---|---:|---:|
| Z1_20_PICKS | 20 | 2 |
| Z1_9_PICKS | 9 | 0 |
| Z2_20_PICKS | 20 | 0 |
| HAZ_10_PICKS | 10 | 1 |
| FEX_15_PICKS | 15 | 0 |

Out-of-range indices 98/99 are placeholders, not injected scenarios. The project rule requires at least two injected errors per simulation. `Z1_9_PICKS` also conflicts with the content-schema minimum of 10 picks.

Recommended action: add two in-range, distinct error scenarios to every simulation and decide whether the beginner scenario becomes 10 picks or receives a documented schema exception.

### High - Production dependencies have known vulnerabilities

**Update (2026-08-16): remediated.** The app now runs on Next 16.3.1 with matching `eslint-config-next` and ESLint 9; async cookies, dynamic route params, and flat lint config were migrated. `npm audit --omit=dev` reports zero vulnerabilities. The production build explicitly uses `next build --webpack` because the project has a deliberate webpack fallback. Middleware now uses the Next 16 `proxy.ts` convention and fonts are managed through `next/font`.

`npm audit --omit=dev` reports four high-severity findings involving Next.js, PostCSS, nanoid, and ws. The full suggested Next.js remediation is a breaking major upgrade.

Recommended action: plan a controlled framework upgrade, apply non-breaking transitive fixes where possible, and rerun build, auth, API, and browser regression suites.

### High - Required content validation infrastructure is absent

Directories:
- `src/schemas/`
- `content/labs/`
- `content/simulations/`
- `content/questions/`
- `content/directives/`

These directories are empty. This conflicts with the rule that content files are schema-validated and leaves SOP/lab/question content outside the intended architecture.

Recommended action: implement JSON schemas, a validation command/test, and representative content artifacts before content authoring scales.

### Medium - Spanish is complete for coaching, not for the full simulator

Spanish coaching content and desktop/compact coaching headings are now localized. Remaining English surfaces include scenario selection, results, RF Device input/error messages, BlueprintMap guidance, and other navigation. The root document also remains `<html lang="en">` after selecting Spanish.

Recommended action: move language to an app-level provider, localize all trainee-facing surfaces, and update the document language dynamically.

### Medium - Visible encoding corruption exists in RF Device UI

File: `src/components/simulator/RFDevice.tsx`

Visible literals include corrupted forms of an em dash, check mark, diagonal arrow, ellipsis, and section comments. Non-WT4000 device modes can display strings such as `âœ“ OK` and `â†™ Scan on Warehouse Floor`.

Recommended action: normalize the file encoding and replace visible corrupted literals with ASCII-safe or intentional Unicode text.

### Medium - Tablet and 3D performance remain unverified

File: `src/components/warehouse/3d/WarehouseScene3D.tsx`

The canvas uses `frameloop="always"`, so static scenes render continuously. This can increase tablet battery use and heat. Compact mode also uses `100dvh` with hidden overflow, and beginner coaching consumes variable height.

Recommended action: return to demand-driven rendering where possible and run screenshot/touch/overflow checks at representative tablet sizes.

### Medium - Test coverage is concentrated in pure logic

The engine and analytics tests are strong. Missing coverage includes API session persistence, authorization, middleware behavior, full simulator step routing, responsive layout, language switching, and 3D interaction fallbacks.

Recommended action: add route-handler integration tests and Playwright journeys for Build Cart, one full Round, exception recovery, EN/ES switching, and tablet viewports.

### Low - Build warning and external font dependency

File: `src/app/layout.tsx`

The production build reports a custom-font lint warning. Fonts load from Google, which also creates an avoidable network dependency for warehouse/kiosk use.

Recommended action: move fonts to `next/font` or self-host them.

### Low - Middleware role source differs from server authorization

File: `src/middleware.ts`

Middleware reads role from Supabase `user_metadata`, while server authorization resolves role from the database. Server-side checks are the trustworthy boundary, but the mismatch can cause incorrect early redirects and should not be treated as authoritative authorization.

Recommended action: keep DB-backed checks on every protected server/API surface and document middleware as navigation-only defense in depth.

## Strengths

- Pure TypeScript state machine with explicit transitions and immutable session updates.
- Strong unit coverage for happy paths, sequence enforcement, scoring, error injection, and floor readiness.
- Strict target-tote validation during Pick Stage.
- Clear canonical input pipeline from UI to engine.
- Production build succeeds with no TypeScript errors.
- Spanish coaching now has complete workflow parity and a regression test.

## Recommended Remediation Order

1. Fix session persistence integrity and best-score logic.
2. Make all five scenarios compliant with injected-error requirements.
3. Address production dependency vulnerabilities.
4. Add schema validation and real content artifacts.
5. Complete app-wide Spanish localization and repair encoding defects.
6. Add API/browser integration tests and perform tablet usability verification.
7. Optimize 3D rendering and clean the font warning.

## Release Gate

Do not use WarehousePro for formal floor-ready certification until findings 1-4 are resolved. It is suitable for continued prototype demonstrations and supervised usability testing.
