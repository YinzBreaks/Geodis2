# Simulator Readiness Report (2026-08-14)

> Superseded by `docs/app-evaluation-2026-08-16.md`.

## Scope
- Simulator usability and interaction reliability for tablet + desktop.
- Localization coverage for EN/ES in simulator surfaces.
- Workflow correctness confidence from targeted tests.

## Executive Status
- Overall readiness: **Needs targeted remediation before stable training build**.
- Strength: architecture is coherent, compile is clean, most core workflow tests pass.
- Primary risk: UX precision and localization consistency, not core state-machine architecture.

## Evidence Snapshot
- Type check: `npx tsc --noEmit` passed.
- Targeted tests: `npx vitest run src/lib/assetContext.test.ts src/engine/simulation-engine.test.ts`
  - 65 passed, 0 failed.
  - Tote scan strictness test is now aligned with validator behavior at `PK_SCAN_TOTE_BARCODE`.

## Pass/Fail Matrix

### 1) Workflow correctness confidence
- Status: **PASS**
- Evidence:
  - Step-to-asset mapping tests pass in `src/lib/assetContext.test.ts`.
  - Most simulation transition tests pass in `src/engine/simulation-engine.test.ts`.
- Confirmed behavior:
  - `PK_SCAN_TOTE_BARCODE` enforces target tote equality (`WRONG_TOTE` on mismatch), aligned in both test and validator.

### 2) Full-screen floor/cart usability
- Status: **IMPROVED, needs live device verification**
- Evidence:
  - Floor band height changed from fixed value to responsive clamp in `src/app/globals.css`.
  - Cart-focused camera framing and vertical placement tuned in `src/components/warehouse/3d/WarehouseScene3D.tsx`.
- Remaining risk:
  - Ratio behavior is still static across steps; some cart-focused phases may still feel constrained depending on viewport.

### 3) Location sign obstruction during item interactions
- Status: **PASS (code-level)**
- Evidence:
  - Location label now repositions/scales during item scan context and clickability is gated to location-scan context in `src/components/warehouse/3d/Shelf3D.tsx`.
- Remaining risk:
  - Needs manual tablet touch verification to ensure no accidental overlap with item labels in all shelf levels.

### 4) Scan affordance clarity (single dominant target)
- Status: **PARTIAL**
- Evidence:
  - Fallback scan panel exists and presents an active target in `src/components/warehouse/WarehouseFloor.tsx`.
  - Some non-action labels remain prominent in 3D overlays.
- Gaps:
  - Non-localized and always-visible labels can distract from active target.

### 5) EN/ES localization completeness
- Status: **PARTIAL / INCOMPLETE**
- Evidence:
  - Base dictionary exists in `src/lib/i18n.ts`.
  - Sim page and key warehouse panel text use translation helper.
  - Coaching ES coverage is limited: 22 ES step entries vs 46 EN step entries.
- Gaps:
  - Missing ES coaching entries include most exception flow and round-wrap steps.
  - Many hardcoded literals remain in simulator/warehouse components.

## High-Priority Gaps (ranked)

1. **Localization consistency across simulator surfaces**
- Files:
  - `src/components/warehouse/WarehouseFloor.tsx`
  - `src/components/warehouse/3d/WarehouseScene3D.tsx`
  - `src/components/warehouse/3d/Shelf3D.tsx`
  - `src/app/sim/page.tsx`
- Action:
  - Move hardcoded literals to `src/lib/i18n.ts` keys.
  - Eliminate mixed-language inline templates in confirm labels and exception overlays.

2. **Spanish coaching coverage gap**
- Files:
  - `src/data/coachingContent.ts`
  - `src/data/coachingContent.es.ts`
- Action:
  - Add missing ES entries for all high-impact steps, especially `EX_*`, `PK_END_OF_TOTE_DISPLAY`, `PK_PRESS_CTRL_A`, and `PS_*` round-wrap steps.

3. **Affordance simplification in 3D overlays**
- Files:
  - `src/components/warehouse/3d/Shelf3D.tsx`
  - `src/components/warehouse/3d/WarehouseScene3D.tsx`
- Action:
  - Dim or hide non-action labels when a specific scan target is active.
  - Keep one dominant visual action cue per step.

4. **Step-aware floor/cart ratio tuning**
- Files:
  - `src/app/sim/page.tsx`
  - `src/app/globals.css`
- Action:
  - Apply step-sensitive layout ratios (cart-heavy steps allocate more floor width).

## Immediate Execution Plan (next sprint slice)
1. Complete simulator localization pass for all visible trainee-facing strings.
2. Fill Spanish coaching gaps for exception and completion flows.
3. Run a tablet QA script across Build Cart + one full Round with pass/fail logging.
4. Apply step-aware floor ratio tuning after QA observations.

## Suggested Exit Criteria for "Stable Training Build"
- 100% pass on scripted tablet flow for Build Cart + Pick Round.
- No unresolved translation fallbacks in simulator core surfaces.
- No ambiguous active scan target in any scannable step.
- Test suite green for simulation engine and asset-context behavior.
