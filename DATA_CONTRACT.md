# DATA_CONTRACT.md — WarehousePro Type Definitions
# All core types, enums, and interfaces for the platform

---

## Enums

### WorkflowStep
Every user action in the platform maps to exactly one WorkflowStep.
This is the atomic unit of the entire training system.

```typescript
enum WorkflowStep {
  // === BUILD CART PHASE ===
  BC_TRAVEL_TO_COMMAND_CENTER   = "BC_TRAVEL_TO_COMMAND_CENTER",
  BC_RECEIVE_TOTE_COUNT         = "BC_RECEIVE_TOTE_COUNT",
  BC_OBTAIN_CART                = "BC_OBTAIN_CART",
  BC_LOAD_TOTES                 = "BC_LOAD_TOTES",
  BC_LOGIN_RF                   = "BC_LOGIN_RF",
  BC_SELECT_BBWD                = "BC_SELECT_BBWD",         // Type "1"
  BC_SELECT_OUTBOUND            = "BC_SELECT_OUTBOUND",     // Type "2"
  BC_PRESS_CTRL_T               = "BC_PRESS_CTRL_T",        // Change task group
  BC_CONFIRM_TASK_GROUP         = "BC_CONFIRM_TASK_GROUP",  // Enter twice
  BC_SCAN_ZONE_TASK_GROUP       = "BC_SCAN_ZONE_TASK_GROUP",// Scan zone/FEX
  BC_SELECT_MAKE_TOTE_CART      = "BC_SELECT_MAKE_TOTE_CART",// Type "1"
  BC_SCAN_CART_BARCODE          = "BC_SCAN_CART_BARCODE",
  BC_PLACE_TOTE_IN_SLOT         = "BC_PLACE_TOTE_IN_SLOT",
  BC_SCAN_TOTE_BARCODE          = "BC_SCAN_TOTE_BARCODE",   // Repeat x9
  BC_PRESS_CTRL_E               = "BC_PRESS_CTRL_E",        // Finalize cart

  // === PICK PHASE ===
  PK_PICKUP_CART                = "PK_PICKUP_CART",
  PK_LOGIN_RF                   = "PK_LOGIN_RF",
  PK_SELECT_BBWD                = "PK_SELECT_BBWD",
  PK_SELECT_OUTBOUND            = "PK_SELECT_OUTBOUND",
  PK_READ_PICK_DISPLAY          = "PK_READ_PICK_DISPLAY",
  PK_TRAVEL_TO_LOCATION         = "PK_TRAVEL_TO_LOCATION",
  PK_VERIFY_LOCATION            = "PK_VERIFY_LOCATION",
  PK_VERIFY_ITEM                = "PK_VERIFY_ITEM",
  PK_SCAN_ITEM_UPC              = "PK_SCAN_ITEM_UPC",
  PK_PICK_QUANTITY              = "PK_PICK_QUANTITY",
  PK_PLACE_IN_TOTE              = "PK_PLACE_IN_TOTE",
  PK_ENTER_QUANTITY             = "PK_ENTER_QUANTITY",
  PK_SCAN_TOTE_BARCODE          = "PK_SCAN_TOTE_BARCODE",
  PK_END_OF_TOTE_DISPLAY        = "PK_END_OF_TOTE_DISPLAY",
  PK_PRESS_CTRL_A               = "PK_PRESS_CTRL_A",        // Confirm tote complete
  PK_PLACE_TOTE_ON_CONVEYOR     = "PK_PLACE_TOTE_ON_CONVEYOR",

  // === PICK STAGE (wrap-up) ===
  PS_CONTINUE_NEXT_TOTE         = "PS_CONTINUE_NEXT_TOTE",
  PS_TRASH_PICKUP               = "PS_TRASH_PICKUP",
  PS_LAST_ITEM_IN_BOX           = "PS_LAST_ITEM_IN_BOX",
  PS_LAST_ITEM_ON_PALLET        = "PS_LAST_ITEM_ON_PALLET",
  PS_ROUND_COMPLETE             = "PS_ROUND_COMPLETE",

  // === EXCEPTION HANDLING ===
  EX_TOTE_ALREADY_ALLOCATED     = "EX_TOTE_ALREADY_ALLOCATED",
  EX_CART_ALREADY_CREATED       = "EX_CART_ALREADY_CREATED",
  EX_INCORRECT_LOCATION         = "EX_INCORRECT_LOCATION",
  EX_INCORRECT_TOTE             = "EX_INCORRECT_TOTE",
  EX_INVALID_ITEM_LAST          = "EX_INVALID_ITEM_LAST",
  EX_INVALID_ITEM_NOT_LAST      = "EX_INVALID_ITEM_NOT_LAST",
  EX_SHORT_INVENTORY            = "EX_SHORT_INVENTORY",
  EX_DAMAGED_ITEM               = "EX_DAMAGED_ITEM",
  EX_PRESS_CTRL_W               = "EX_PRESS_CTRL_W",        // Go back
  EX_PRESS_CTRL_K               = "EX_PRESS_CTRL_K",        // Skip pick
  EX_NOTIFY_LEAD                = "EX_NOTIFY_LEAD",
  EX_ITEM_TO_AMNESTY_BIN        = "EX_ITEM_TO_AMNESTY_BIN",
  EX_ITEM_TO_IC                 = "EX_ITEM_TO_IC",
}
```

### Zone
```typescript
enum Zone {
  Z1  = "Z1",
  Z2  = "Z2",
  Z3  = "Z3",
  Z4  = "Z4",
  HAZ = "HAZ",  // Hazardous materials zone
  FEX = "FEX",  // Express orders — special task group, not a physical zone
}
```

### ScanResult
```typescript
enum ScanResult {
  SUCCESS        = "SUCCESS",
  WRONG_ITEM     = "WRONG_ITEM",
  WRONG_TOTE     = "WRONG_TOTE",
  WRONG_LOCATION = "WRONG_LOCATION",
  TOTE_ALLOCATED = "TOTE_ALLOCATED",
  CART_ALLOCATED = "CART_ALLOCATED",
  ITEM_NOT_FOUND = "ITEM_NOT_FOUND",
  ITEM_DAMAGED   = "ITEM_DAMAGED",
  TIMEOUT        = "TIMEOUT",
}
```

### ContentType
```typescript
enum ContentType {
  LAB        = "LAB",        // Guided training with hints
  SIMULATION = "SIMULATION", // Scored, timed practice
  QUIZ       = "QUIZ",       // Review questions
  DIRECTIVE  = "DIRECTIVE",  // SOP reference material
}
```

### DifficultyLevel
```typescript
enum DifficultyLevel {
  BEGINNER     = "BEGINNER",     // Full hints, unlimited attempts
  INTERMEDIATE = "INTERMEDIATE", // Hints on request, 2 attempts
  ADVANCED     = "ADVANCED",     // No hints, scored, timed
}
```

---

## Core Domain Interfaces

### Warehouse Entities

```typescript
// A single shelf location in the warehouse
interface WarehouseLocation {
  locationId: string       // e.g. "316-001-A1"
  zone: Zone
  aisle: string
  bay: string
  level: string
  displayLabel: string     // What shows on RF Device: "316-001-A1"
}

// An item/product in inventory
interface WarehouseItem {
  itemId: string
  sku: string
  upcBarcode: string       // What gets scanned on the item
  description: string
  unitOfMeasure: string    // "Unit", "Case", etc.
  lastFourDigits: string   // RF Device shows "Item (Last 4): XXXX"
  imageUrl?: string        // For simulation visual fidelity
}

// A single pick task — one unit of work for the picker
interface PickTask {
  pickTaskId: string
  orderNumber: string
  item: WarehouseItem
  location: WarehouseLocation
  quantityRequired: number
  targetToteId: string     // Which tote this item belongs in
  targetSlot: ToteSlot     // Which slot on the cart
  isExpress: boolean       // FEX order
}

// A tote (one of 9 on the cart)
type ToteSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

interface Tote {
  toteId: string           // e.g. "T00000000011692"
  barcode: string          // Scannable barcode value
  slot: ToteSlot
  pickedItems: PickedItem[]
  isComplete: boolean      // True after CTRL+A confirmation
  placedOnConveyor: boolean
}

// A successfully picked item recorded in a tote
interface PickedItem {
  pickTaskId: string
  item: WarehouseItem
  quantityPicked: number
  scannedAt: Date
}

// The cart for an active picking round
interface PickCart {
  cartId: string
  cartBarcode: string      // e.g. "C000000083"
  totes: Tote[]            // Always length 9
  zone: Zone
  taskGroup: string
  roundNumber: number
  totalItemsPicked: number
  isBuilt: boolean         // True after CTRL+E
}
```

---

## Simulation Interfaces

```typescript
// A single scan event (simulated)
interface ScanEvent {
  scanEventId: string
  sessionId: string
  step: WorkflowStep
  expectedValue: string    // What the correct barcode value is
  scannedValue: string     // What the user submitted
  result: ScanResult
  timestamp: Date
  responseTimeMs: number
}

// An error that occurred during simulation
interface SimulationError {
  errorId: string
  sessionId: string
  step: WorkflowStep
  errorType: ScanResult
  injected: boolean        // True if the error was deliberately injected by the scenario
  corrected: boolean
  correctionSteps: WorkflowStep[]
  occurredAt: Date
}

// A complete simulation session
interface SimulationSession {
  sessionId: string
  userId: string
  moduleId: string
  moduleType: ContentType
  difficulty: DifficultyLevel

  // Cart state
  cart: PickCart
  pickQueue: PickTask[]
  completedPicks: PickedItem[]

  // Progress tracking
  currentStep: WorkflowStep
  currentPickIndex: number
  currentToteSlot: ToteSlot

  // Events
  scanEvents: ScanEvent[]
  errors: SimulationError[]

  // Timing
  startedAt: Date
  completedAt?: Date
  totalTimeMs?: number

  // Outcome
  score?: SessionScore
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED"
}

// Final score for a completed session
interface SessionScore {
  sessionId: string
  totalPicks: number
  correctFirstScanRate: number  // 0–1
  errorCount: number
  correctedErrorCount: number
  averageResponseTimeMs: number
  accuracyScore: number         // 0–100
  speedScore: number            // 0–100
  finalScore: number            // (accuracy × 0.6) + (speed × 0.4)
  passed: boolean               // finalScore >= passingThreshold
  passingThreshold: number
}
```

---

## Content Interfaces

```typescript
// A step in a lab or simulation
interface ContentStep {
  stepId: string
  order: number
  workflowStep: WorkflowStep
  instruction: string          // What to do
  explanation?: string         // Why (labs only)
  hint?: string                // Available on request (labs only)
  expectedAction: ExpectedAction
  sopReference?: string        // e.g. "BBWD-WI-030 §5.2.9"
}

// What the system expects the user to do
type ExpectedAction =
  | { type: "SCAN"; expectedBarcode: string }
  | { type: "KEY_INPUT"; expectedKeys: string }  // e.g. "CTRL+E"
  | { type: "TYPE"; expectedText: string }
  | { type: "CONFIRM"; message: string }

// An injected error scenario within a simulation
interface ErrorScenario {
  scenarioId: string
  injectAtPickIndex: number
  errorType: ScanResult
  description: string
  expectedResolution: WorkflowStep[]
  sopReference: string
}

// A lab module definition
interface LabModule {
  moduleId: string
  title: string
  description: string
  contentType: ContentType.LAB
  difficulty: DifficultyLevel
  estimatedMinutes: number
  prerequisites: string[]      // moduleIds
  steps: ContentStep[]
  passCriteria: {
    minScore?: number
    requiredSteps: string[]
  }
  sopDocuments: string[]       // e.g. ["BBWD-VJA-030", "BBWD-WI-030"]
  version: string
  lastUpdated: string
}

// A simulation scenario definition
interface SimulationScenario {
  moduleId: string
  title: string
  description: string
  contentType: ContentType.SIMULATION
  difficulty: DifficultyLevel
  estimatedMinutes: number
  zone: Zone
  pickCount: number
  toteCount: number
  steps: ContentStep[]
  errorScenarios: ErrorScenario[]   // Min 2 per simulation
  passCriteria: {
    minScore: number               // e.g. 75
    maxErrors: number
  }
  scoringWeights: {
    accuracy: number               // e.g. 0.6
    speed: number                  // e.g. 0.4
  }
  version: string
  lastUpdated: string
}

// A quiz question
interface QuizQuestion {
  questionId: string
  workflowStep: WorkflowStep
  sopReference: string
  questionText: string
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SCENARIO"
  options: string[]
  correctOptionIndex: number
  explanation: string
  difficulty: DifficultyLevel
  tags: string[]
}
```

---

## User & Progress Interfaces

```typescript
// A platform user (picker/trainee)
interface TraineeUser {
  userId: string
  employeeId: string
  name: string
  facilityId: string
  startDate: Date
  role: "PICKER" | "LEAD" | "SUPERVISOR" | "ADMIN"
  completedModules: string[]
  currentModuleId?: string
  totalScore: number
  rank?: "BEGINNER" | "DEVELOPING" | "PROFICIENT" | "EXPERT"
}

// Progress record per module
interface ModuleProgress {
  progressId: string
  userId: string
  moduleId: string
  attempts: number
  bestScore: number
  lastAttemptAt: Date
  completed: boolean
  completedAt?: Date
  timeSpentMs: number
}
```

---

## RF Device Screen Interface

```typescript
// Represents what's displayed on the RF Device screen (for simulation UI)
interface RFDeviceScreen {
  screenId: string
  workflowStep: WorkflowStep
  lines: RFScreenLine[]        // Max ~6 lines on real device
  activeField?: string         // Which field has cursor/input
  inputType?: "TEXT" | "BARCODE" | "NUMERIC"
  contextualData?: Record<string, string>  // e.g. { toteId, location, item }
}

interface RFScreenLine {
  label?: string
  value?: string
  isHighlighted?: boolean      // Location shown in red on real device
  isCursorField?: boolean
}

// Example: the pick display screen (§5.2)
// Tote:   T00000000011692
// Aloc:   316-001-A1           ← highlighted
// Item:   024505572
// Item (Last 4): 4375
// Qty: 1 Unit
// Item Barcode: _              ← cursor here
```
