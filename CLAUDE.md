# CLAUDE.md — WarehousePro Training Platform
# Rules for Claude Code (VS Code)

## Project Identity
This is **WarehousePro** — a warehouse picker training and simulation platform built for GEODIS logistics operations.
The business goal is to reduce new picker onboarding time from 4 weeks to 2 weeks or less.
Every feature decision should be evaluated against this goal.

---

## Role
You are a senior full-stack engineer and instructional systems designer.
You deeply understand:
- Warehouse RF picking operations (BBWD/GEODIS workflow)
- Adult learning theory and skill-building through simulation
- TypeScript, React, Node.js, PostgreSQL
- State machine design for simulation engines

---

## Canonical Domain Vocabulary
**Always use these exact terms — never substitute synonyms.**

| Term | Definition |
|------|-----------|
| **RF Device** | Radio Frequency handheld scanner unit used by pickers |
| **Pick** | The act of retrieving a single item from a shelf location |
| **Pick Front** | The specific shelf face/location where an item is stored |
| **Tote** | One barcoded container on the picking cart (always 9 per cart) |
| **Cart** | The picking cart holding 9 totes |
| **Round** | One complete picking cycle; ends when a tote reaches capacity or "End Of Tote" is displayed |
| **Task Group** | The zone/batch assignment that determines which picks to execute |
| **Zone** | A physical area of the warehouse (Z1, Z2, Z3, Z4, HAZ) |
| **Build Cart** | The setup procedure to initialize a new cart and scan totes into slots |
| **Pick Stage** | The active picking phase after cart is built |
| **End Of Tote** | RF Device message indicating a tote is full and must be placed on conveyor |
| **Putwall** | Downstream conveyor destination for completed totes |
| **Amnesty Bin** | Location for incorrect or damaged items |
| **IC** | Inventory Control — department that resolves inventory discrepancies |
| **Tasker/CSR** | The supervisor/coordinator who directs pickers at Command Center |
| **Express (FEX)** | High-priority order type; scanned with "FEX" task group code |
| **CTRL+T** | RF keyboard shortcut to change Task Group |
| **CTRL+E** | RF keyboard shortcut to finalize cart build and start picking |
| **CTRL+A** | RF keyboard shortcut to accept "End Of Tote" and confirm tote complete |
| **CTRL+W** | RF keyboard shortcut to go back to the previous screen |
| **CTRL+K** | RF keyboard shortcut to skip a pick (exception handling) |

---

## Workflow Reference (Source of Truth)

### Phase 1: Build Cart (BBWD-VJA-030 / BBWD-WI-030 §5.1)
```
1. Travel to Command Center
2. Get direction from Tasker/CSR on how many totes to acquire
3. Obtain Pick Cart + load pick totes
4. Log into RF Device
5. Type "1" (BBWD) → Enter
6. Type "2" (Outbound Phase II) → Enter
7. Press CTRL+T → Task Group changes → press Enter twice
8. Select Zone/Task Group (scan barcode); use FEX for Express orders
9. [US only] Type "1" (Make Tote Cart BB) → Enter
10. Scan the Pick Cart barcode
11. Scan each Pick Tote barcode into the slot shown on RF Device (repeat x9)
12. Press CTRL+E when all 9 totes are scanned → cart is active
```

### Phase 2: Pick (BBWD-WI-030 §5.2)
```
1. Pick up Cart
2. Log into RF Device
3. Type "1" (BBWD) → Enter
4. Type "2" (Outbound Phase II) → Enter
5. RF Device displays first pick
6. Travel to Pick Front location shown on RF Device
7. Verify physical location matches RF Device
8. Verify the item
9. Scan item UPC barcode
10. Pick the quantity shown on RF Device
11. Place item(s) in tote at the slot/position shown (RF Device shows correct Tote ID)
12. Enter quantity picked → press Enter
13. Scan the Pick Tote barcode shown on RF Device
14. Repeat steps 5–13 until "End Of Tote" appears
15. Press CTRL+A to confirm tote complete
16. Place completed tote on nearest conveyor (Putwall)
17. Continue until all totes complete
18. Complete all trash pickup throughout process
```

### Exception Handling (BBWD-WI-030 §6) — must be simulatable
| Error Code | Cause | Resolution |
|-----------|-------|-----------|
| "Tote already allocated" | Tote still has inventory in system | Set aside, contact Lead/Supervisor |
| "Pick Cart Already Created" | Cart still active in system | Set aside, contact Lead/Supervisor |
| Incorrect Location | Location mismatch | CTRL+W → verify location |
| Incorrect Tote | Tote number mismatch | CTRL+W → verify tote number |
| Invalid Item (last item) | Wrong item, last at location | Notify Lead → CTRL+K → tote to Putwall → item to Amnesty Bin |
| Invalid Item (not last) | Wrong item, more remain | Notify Lead → tote to Putwall → item to IC |
| Short Inventory | Item not at location | Verify location → notify Lead → CTRL+K → finish path → return to verify |
| Damaged Item | Item physically damaged | Amnesty Bin (ziplock bag first if leaking) |

---

## Tech Stack

```
Frontend:     React 18 + TypeScript (strict) + Tailwind CSS
Backend:      Next.js 14 (App Router) with API routes
Database:     PostgreSQL via Supabase
Auth:         Supabase Auth
ORM:          Prisma
Deployment:   Vercel
Testing:      Vitest + React Testing Library
State:        Zustand (client) + React Query (server state)
```

> Update this section as decisions are finalized. Never assume the stack — check here first.

---

## Project Architecture

```
/src
  /engine           ← Simulation state machine (pure TypeScript, no UI deps)
  /types            ← All shared TypeScript interfaces and enums
  /hooks            ← React hooks (useScanner, useSimulation, useProgress)
  /services         ← API calls, DB access, business logic
  /components
    /simulator      ← RF Device screen emulator components
    /labs           ← Guided training lab components
    /quiz           ← Review question components
    /directives     ← SOP display components
    /shared         ← Reusable UI components
  /data             ← Static seed data (warehouse locations, items, zones)

/content
  /labs             ← Lab module definitions (.json)
  /simulations      ← Simulation scenario definitions (.json)
  /questions        ← Quiz question bank (.json)
  /directives       ← SOP content files (.md)

/prisma
  schema.prisma     ← Database schema

/.claude
  CLAUDE.md         ← This file (project rules)
  DATA_CONTRACT.md  ← Type definitions and data shapes
  SIMULATION.md     ← Simulation engine rules and state machine spec
  CONTENT_SCHEMA.md ← Content file format specifications
```

**Hard rules:**
- Simulation state lives ONLY in `/src/engine/` — never in React components
- Components never contain business logic — only rendering and event delegation
- All warehouse domain types defined in `/src/types/domain.ts`
- All content files validated against JSON schemas in `/src/schemas/`
- `useScanner` hook is the ONLY way components interact with scan events

---

## Code Standards

### TypeScript
- Strict mode always (`"strict": true` in tsconfig)
- Zero `any` types — define interfaces or use `unknown` with type guards
- Enums for all fixed-value domain concepts (WorkflowStep, ErrorType, Zone, etc.)
- JSDoc comments on all public functions and exported types

### Naming Conventions
```typescript
// Files: kebab-case
simulation-engine.ts
use-scanner.ts
pick-tote-card.tsx

// Types/Interfaces: PascalCase, no "I" prefix
interface PickTask { }
type ToteSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// Enums: PascalCase enum, SCREAMING_SNAKE values
enum WorkflowStep {
  BUILD_CART_LOGIN = "BUILD_CART_LOGIN",
  SCAN_CART_BARCODE = "SCAN_CART_BARCODE",
  ...
}

// Functions: camelCase, verb-first
function scanItemBarcode() {}
function validateToteSlot() {}

// Constants: SCREAMING_SNAKE
const MAX_TOTES_PER_CART = 9
const ROUND_ITEM_LIMIT = 150  // update when confirmed
```

### Comments
- Comment every non-obvious warehouse domain rule
- Reference the SOP section number when implementing a rule
  ```typescript
  // Per BBWD-WI-030 §5.2.12: CTRL+A confirms tote complete after End Of Tote
  function confirmToteComplete() { ... }
  ```

### Testing
- All simulation state transitions must have unit tests
- Test both happy path AND every exception from §6
- Test files live adjacent to source: `simulation-engine.test.ts`

---

## Content Rules

### Labs (Guided Training)
- Step-by-step with hints available
- Never advance automatically — wait for correct user action
- Show the "why" behind each step
- Must be completable by a new hire with zero warehouse experience

### Simulations (Scored Practice)
- Timed, realistic, no hints
- Must include at least 2 injected error scenarios per simulation
- Score calculated as: `(accuracy × 0.6) + (speed × 0.4)`
- All errors logged with step, type, and whether corrected

### Review Questions
- Every question must map to at least one `WorkflowStep`
- Include the SOP source reference in the question metadata
- Mix of: scenario-based, keyboard shortcut recall, exception handling

### Directives
- Exact SOP language, never paraphrased
- Versioned (include doc number and effective date)
- Cross-linked to relevant labs and simulations

---

## What NOT To Do
- ❌ Never hardcode warehouse location data — use `/src/data/`
- ❌ Never skip error/exception states — every scan has success, error, and timeout paths
- ❌ Never merge simulation logic into React components
- ❌ Never use `any` type
- ❌ Never implement a UI without checking target device (mobile/tablet/desktop kiosk)
- ❌ Never write a new WorkflowStep without adding it to the state machine transitions map
- ❌ Never store simulation session state in a component — use the engine + Zustand
- ❌ Never advance a simulation step without validating the scan input against expected value

---

## Open Questions (resolve before implementing affected features)
- [ ] Target device confirmed? (handheld RF terminal emulation vs. tablet vs. desktop)
- [ ] Are zones always Z1–Z4 + HAZ, or are there others?
- [ ] What triggers a new cart — 150 total items, or when all 9 totes reach capacity?
- [ ] Does FEX (Express) have a different pick flow, or just a different task group scan?
- [ ] Will we support CA/pop-up facility variants in v1?
- [ ] What are the actual item/location/tote barcode formats? (needed for simulation realism)

---

## RF Device Configuration

Device models are defined in `/src/types/devices.ts`.
The emulator reads this config at runtime — adding a new device requires ONLY a new entry
in the `RF_DEVICE_MODELS` registry. No other files need to change.

```
Currently supported models:
  SYMBOL_WT4000      — PRIMARY (confirmed March 2026): landscape terminal,
                       20×6 chars, 240px emulator width, physical keypad,
                       white-on-black terminal, monospace font,
                       soft key bar (bottom, 5 buttons)
  HONEYWELL_CK65     — 20×8 chars, physical keypad, no touchscreen, green terminal
  ZEBRA_TC520K       — 5-inch Android, portrait, ~390px emulator width,
                       no physical keyboard, SE4710 imager, all-touch + side-trigger,
                       Android WMS aesthetic (white bg, Roboto/Inter, 56 px min targets)
  ZEBRA_TC52         — 24×10 chars, touchscreen, no physical CTRL keys, soft key overlay
                       (legacy model — superseded by TC520K)
  GENERIC_TERMINAL   — fallback / unconfirmed device

Active device:
  ACTIVE_DEVICE_MODEL_ID = "SYMBOL_WT4000"   (in /src/types/devices.ts)
  Confirmed by GEODIS IT — March 2026.

Soft key bar (TC520K and TC52):
  5 buttons: CTRL+T, CTRL+E, CTRL+A, CTRL+W, CTRL+K
  Buttons are disabled/grayed when not valid for the current WorkflowStep.

To add a new device model:
  1. Add an entry to RF_DEVICE_MODELS in /src/types/devices.ts
  2. That's it. The emulator, useScanner, and soft key renderer
     all derive their behavior from this registry.
```

---

## Seed Data

All simulation seed data lives in `/src/data/seedData.ts`. Never hardcode
warehouse data in tests or components — import from here.

```
Warehouse Locations:  30 locations across Z1, Z2, Z3, Z4, HAZ
Warehouse Items:      14 items (standard + HAZ + multi-qty examples)
Cart Templates:       7 carts (Z1×2, Z2, Z3, Z4, HAZ, FEX)
Pre-built Scenarios:  Z1_20_PICKS, Z1_10_PICKS, Z2_20_PICKS, HAZ_10_PICKS, FEX_15_PICKS

Barcode formats (from SOP screenshots — confirm exact values with GEODIS IT):
  Cart:     C + 9 digits   →  C000000083
  Tote:     T + 14 digits  →  T00000000011692
  Item UPC: 12-digit UPC-A
  Location: AAA-NNN-NN     →  316-001-A1
  Zone:     ZONE-ZN-BARCODE (placeholder — confirm actual values with ops)

⚠️  SKUs and UPCs are representative placeholders.
    Replace with real GEODIS product catalog once data access is confirmed.
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
