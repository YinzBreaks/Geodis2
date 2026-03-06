# SIMULATION.md — Simulation Engine Specification
# Rules for /src/engine/simulationEngine.ts

---

## Overview

The simulation engine is a **pure TypeScript state machine** with no React dependencies.
It receives actions (scan events, key presses, confirmations) and produces new state.
All UI is driven by subscribing to state changes — never by calling engine functions directly from components.

Architecture: `Action → Engine.dispatch() → new SimulationSession state → React re-render`

---

## State Machine

### State Transition Map

Each `WorkflowStep` defines what valid next steps are and what actions trigger them.

```
BUILD CART FLOW:
BC_LOGIN_RF
  → [key: "1" + Enter] → BC_SELECT_BBWD
  → [key: "2" + Enter] → BC_SELECT_OUTBOUND
  → [key: CTRL+T] → BC_PRESS_CTRL_T
  → [key: Enter×2] → BC_CONFIRM_TASK_GROUP
  → [scan: zone barcode] → BC_SCAN_ZONE_TASK_GROUP
  → [key: "1" + Enter] → BC_SELECT_MAKE_TOTE_CART
  → [scan: cart barcode] → BC_SCAN_CART_BARCODE
  → [place + scan: tote barcode] → BC_SCAN_TOTE_BARCODE  ← repeats 9×
  → [key: CTRL+E when slot === 9] → BC_PRESS_CTRL_E → PICK FLOW begins

PICK FLOW:
PK_LOGIN_RF
  → [key: "1" + Enter] → PK_SELECT_BBWD
  → [key: "2" + Enter] → PK_SELECT_OUTBOUND
  → [auto] → PK_READ_PICK_DISPLAY (RF Device shows pick)
  → [physical travel — confirmed] → PK_TRAVEL_TO_LOCATION
  → [confirm location match] → PK_VERIFY_LOCATION
  → [confirm item match] → PK_VERIFY_ITEM
  → [scan: item UPC] → PK_SCAN_ITEM_UPC
  → [confirm quantity] → PK_PICK_QUANTITY
  → [place item] → PK_PLACE_IN_TOTE
  → [key: quantity + Enter] → PK_ENTER_QUANTITY
  → [scan: tote barcode] → PK_SCAN_TOTE_BARCODE

  IF more picks remain:
  → [auto] → PK_READ_PICK_DISPLAY (loops)

  IF "End Of Tote":
  → [auto] → PK_END_OF_TOTE_DISPLAY
  → [key: CTRL+A] → PK_PRESS_CTRL_A
  → [auto] → PK_PLACE_TOTE_ON_CONVEYOR
  → [auto] → PS_CONTINUE_NEXT_TOTE OR PS_ROUND_COMPLETE
```

---

## Validation Rules (implement all of these)

### Scan Validation
Every scan must be validated before state advances:

```typescript
function validateScan(
  step: WorkflowStep,
  scannedValue: string,
  session: SimulationSession
): ScanResult {
  switch (step) {
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return scannedValue === session.cart.cartBarcode
        ? ScanResult.SUCCESS
        : ScanResult.WRONG_ITEM

    case WorkflowStep.BC_SCAN_TOTE_BARCODE:
      const expectedTote = session.cart.totes[session.currentToteSlot - 1]
      if (scannedValue === expectedTote.barcode) return ScanResult.SUCCESS
      if (toteAlreadyAllocated(scannedValue)) return ScanResult.TOTE_ALLOCATED
      return ScanResult.WRONG_TOTE

    case WorkflowStep.PK_SCAN_ITEM_UPC:
      const currentPick = session.pickQueue[session.currentPickIndex]
      return scannedValue === currentPick.item.upcBarcode
        ? ScanResult.SUCCESS
        : ScanResult.WRONG_ITEM

    case WorkflowStep.PK_SCAN_TOTE_BARCODE:
      const targetTote = session.cart.totes.find(
        t => t.slot === session.pickQueue[session.currentPickIndex].targetSlot
      )
      if (!targetTote) return ScanResult.ITEM_NOT_FOUND
      return scannedValue === targetTote.barcode
        ? ScanResult.SUCCESS
        : ScanResult.WRONG_TOTE
  }
}
```

### Sequence Enforcement (CRITICAL)
These actions are BLOCKED if performed out of order:

| Attempted Action | Blocking Condition | Error Response |
|-----------------|-------------------|----------------|
| CTRL+E | Not all 9 totes scanned | "Please scan all tote slots first" |
| CTRL+A | "End Of Tote" not displayed | "No tote completion pending" |
| Scan item | Not at PK_SCAN_ITEM_UPC step | "Complete previous step first" |
| Enter quantity | Item not yet scanned | "Scan item barcode first" |
| Scan tote | Quantity not entered | "Enter quantity first" |

### Quantity Validation
```typescript
function validateQuantity(input: string, pick: PickTask): boolean {
  const qty = parseInt(input, 10)
  return !isNaN(qty) && qty > 0 && qty <= pick.quantityRequired
  // Note: Partial quantities may be valid — confirm with domain expert
}
```

---

## Error Injection System

Simulations inject errors at predetermined pick indices to train exception handling.

```typescript
interface InjectedError {
  atPickIndex: number
  errorType: ScanResult
  // Engine will make this scan fail regardless of what user scans
}

function shouldInjectError(
  session: SimulationSession,
  scenario: SimulationScenario
): InjectedError | null {
  return scenario.errorScenarios.find(
    e => e.injectAtPickIndex === session.currentPickIndex
  ) ?? null
}
```

### Error Recovery Flows

Each error type has a required recovery sequence that the engine validates:

**WRONG_ITEM (invalid item, last at location):**
```
1. EX_NOTIFY_LEAD
2. EX_PRESS_CTRL_K (skip)
3. PK_PLACE_TOTE_ON_CONVEYOR (to Putwall)
4. EX_ITEM_TO_AMNESTY_BIN
→ Resume normal pick flow
```

**WRONG_ITEM (invalid item, more items remain):**
```
1. EX_NOTIFY_LEAD
2. PK_PLACE_TOTE_ON_CONVEYOR (to Putwall)
3. EX_ITEM_TO_IC
→ Resume normal pick flow
```

**SHORT_INVENTORY:**
```
1. EX_INCORRECT_LOCATION (verify location first — CTRL+W)
2. EX_NOTIFY_LEAD
3. EX_PRESS_CTRL_K (skip)
4. Continue pick path
5. Return to location after full path
6. If still not available: take cart to exception area + notify lead
```

**WRONG_TOTE / WRONG_LOCATION:**
```
1. EX_PRESS_CTRL_W (go back)
2. Re-verify and re-scan correct value
```

**DAMAGED_ITEM:**
```
1. EX_ITEM_TO_AMNESTY_BIN
   - If leaking: ziplock bag FIRST, then Amnesty Bin
```

---

## Scoring Engine

```typescript
function calculateScore(session: SimulationSession, scenario: SimulationScenario): SessionScore {
  const totalScans = session.scanEvents.length
  const correctFirstScans = session.scanEvents.filter(
    e => e.result === ScanResult.SUCCESS
  ).length

  const accuracyRate = correctFirstScans / totalScans  // 0–1
  const accuracyScore = Math.round(accuracyRate * 100)  // 0–100

  // Speed score: compare against target rate (TBD — needs real-world benchmark)
  const TARGET_PICKS_PER_HOUR = 150  // placeholder — confirm with GEODIS
  const actualPicksPerHour = session.completedPicks.length /
    (session.totalTimeMs! / 3_600_000)
  const speedRate = Math.min(actualPicksPerHour / TARGET_PICKS_PER_HOUR, 1)
  const speedScore = Math.round(speedRate * 100)

  const weights = scenario.scoringWeights
  const finalScore = Math.round(
    (accuracyScore * weights.accuracy) + (speedScore * weights.speed)
  )

  return {
    sessionId: session.sessionId,
    totalPicks: session.completedPicks.length,
    correctFirstScanRate: accuracyRate,
    errorCount: session.errors.length,
    correctedErrorCount: session.errors.filter(e => e.corrected).length,
    averageResponseTimeMs:
      session.scanEvents.reduce((sum, e) => sum + e.responseTimeMs, 0) / totalScans,
    accuracyScore,
    speedScore,
    finalScore,
    passed: finalScore >= scenario.passCriteria.minScore,
    passingThreshold: scenario.passCriteria.minScore,
  }
}
```

---

## RF Device Screen Generator

The engine generates the correct RFDeviceScreen for each WorkflowStep.
This drives the simulator UI — the UI never decides what to display.

```typescript
function generateRFScreen(
  step: WorkflowStep,
  session: SimulationSession
): RFDeviceScreen {
  const pick = session.pickQueue[session.currentPickIndex]
  const tote = session.cart.totes.find(t => t.toteId === pick?.targetToteId)

  switch (step) {
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { label: "Tote:", value: tote?.toteId },
          { label: "Aloc:", value: pick.location.displayLabel, isHighlighted: true },
          { label: "Item:", value: pick.item.sku },
          { label: "Item (Last 4):", value: pick.item.lastFourDigits },
          { label: `Qty: ${pick.quantityRequired}`, value: pick.item.unitOfMeasure },
          { label: "Item Barcode:", isCursorField: true },
        ],
        activeField: "Item Barcode",
        inputType: "BARCODE",
      }

    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Make Tote Cart BB" },
          { label: "Pick Cart #:", isCursorField: true },
        ],
        activeField: "Pick Cart #",
        inputType: "BARCODE",
      }

    case WorkflowStep.PK_END_OF_TOTE_DISPLAY:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Info ---" },
          { value: "End Of Tote" },
        ],
        inputType: undefined,
      }

    // ... implement all screens
  }
}
```

---

## Engine API (public interface)

```typescript
// The only way UI interacts with simulation state
interface SimulationEngine {
  // Initialize a new session from a scenario
  startSession(userId: string, scenario: SimulationScenario): SimulationSession

  // Submit a scan (barcode or text input)
  submitScan(sessionId: string, value: string): EngineResult

  // Submit a key press
  submitKeyPress(sessionId: string, keys: string): EngineResult

  // Submit a physical confirmation (travel, place item, etc.)
  confirmAction(sessionId: string, action: WorkflowStep): EngineResult

  // Get current RF Device screen state
  getCurrentScreen(sessionId: string): RFDeviceScreen

  // Abandon a session
  abandonSession(sessionId: string): void
}

interface EngineResult {
  success: boolean
  newStep: WorkflowStep
  scanResult?: ScanResult
  feedback?: string     // Coaching message on error
  sessionComplete?: boolean
  score?: SessionScore
}
```

---

## Critical Engine Rules

1. **Engine is pure** — no side effects, no API calls, no React
2. **Never auto-advance physical steps** — travel, placing items, etc. require explicit `confirmAction` call
3. **All scan validation is in the engine** — UI never decides if a scan is correct
4. **Error injection overrides user input** — injected errors always fail regardless of what was scanned
5. **CTRL+E is only valid at BC_SCAN_TOTE_BARCODE with slot 9 complete** — enforce strictly
6. **Session state is immutable** — every dispatch returns a new session object (no mutation)
7. **Every ScanEvent is logged** — including incorrect attempts and error injections
