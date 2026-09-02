/**
 * domain.ts — WarehousePro canonical domain types
 *
 * All warehouse domain types live here. Zero other files may define domain
 * entities — import from here exclusively.
 *
 * Vocabulary follows CLAUDE.md §Canonical Domain Vocabulary exactly.
 * Enum values follow DATA_CONTRACT.md exactly.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every user action in the platform maps to exactly one WorkflowStep.
 * This is the atomic unit of the entire training system.
 * Per DATA_CONTRACT.md §WorkflowStep
 */
export enum WorkflowStep {
  // === BUILD CART PHASE ===
  // Per BBWD-VJA-030 / BBWD-WI-030 §5.1
  BC_TRAVEL_TO_COMMAND_CENTER = "BC_TRAVEL_TO_COMMAND_CENTER",
  BC_RECEIVE_TOTE_COUNT = "BC_RECEIVE_TOTE_COUNT",
  BC_OBTAIN_CART = "BC_OBTAIN_CART",
  BC_LOAD_TOTES = "BC_LOAD_TOTES",
  BC_LOGIN_RF = "BC_LOGIN_RF",
  BC_SELECT_BBWD = "BC_SELECT_BBWD", // Type "1"
  BC_SELECT_OUTBOUND = "BC_SELECT_OUTBOUND", // Type "2"
  BC_PRESS_CTRL_T = "BC_PRESS_CTRL_T", // Change task group
  BC_CONFIRM_TASK_GROUP = "BC_CONFIRM_TASK_GROUP", // Enter twice
  BC_SCAN_ZONE_TASK_GROUP = "BC_SCAN_ZONE_TASK_GROUP", // Scan zone/FEX barcode
  BC_SELECT_MAKE_TOTE_CART = "BC_SELECT_MAKE_TOTE_CART", // Type "1"
  BC_SCAN_CART_BARCODE = "BC_SCAN_CART_BARCODE",
  BC_PLACE_TOTE_IN_SLOT = "BC_PLACE_TOTE_IN_SLOT",
  BC_SCAN_TOTE_BARCODE = "BC_SCAN_TOTE_BARCODE", // Repeats ×9 (one per slot)
  BC_PRESS_CTRL_E = "BC_PRESS_CTRL_E", // Finalize cart — requires all 9 totes

  // === PICK PHASE ===
  // Per BBWD-WI-030 §5.2
  PK_PICKUP_CART = "PK_PICKUP_CART",
  PK_LOGIN_RF = "PK_LOGIN_RF",
  PK_SELECT_BBWD = "PK_SELECT_BBWD",
  PK_SELECT_OUTBOUND = "PK_SELECT_OUTBOUND",
  PK_READ_PICK_DISPLAY = "PK_READ_PICK_DISPLAY",
  PK_TRAVEL_TO_LOCATION = "PK_TRAVEL_TO_LOCATION",
  PK_VERIFY_LOCATION = "PK_VERIFY_LOCATION",
  PK_VERIFY_ITEM = "PK_VERIFY_ITEM",
  PK_SCAN_ITEM_UPC = "PK_SCAN_ITEM_UPC",
  PK_PICK_QUANTITY = "PK_PICK_QUANTITY",
  PK_PLACE_IN_TOTE = "PK_PLACE_IN_TOTE",
  PK_ENTER_QUANTITY = "PK_ENTER_QUANTITY",
  PK_SCAN_TOTE_BARCODE = "PK_SCAN_TOTE_BARCODE",
  PK_END_OF_TOTE_DISPLAY = "PK_END_OF_TOTE_DISPLAY",
  PK_PRESS_CTRL_A = "PK_PRESS_CTRL_A", // Per BBWD-WI-030 §5.2.15: confirms tote complete
  PK_PLACE_TOTE_ON_CONVEYOR = "PK_PLACE_TOTE_ON_CONVEYOR",

  // === PICK STAGE (wrap-up) ===
  PS_CONTINUE_NEXT_TOTE = "PS_CONTINUE_NEXT_TOTE",
  PS_TRASH_PICKUP = "PS_TRASH_PICKUP",
  PS_LAST_ITEM_IN_BOX = "PS_LAST_ITEM_IN_BOX",
  PS_LAST_ITEM_ON_PALLET = "PS_LAST_ITEM_ON_PALLET",
  PS_ROUND_COMPLETE = "PS_ROUND_COMPLETE",

  // === EXCEPTION HANDLING ===
  // Per BBWD-WI-030 §6
  EX_TOTE_ALREADY_ALLOCATED = "EX_TOTE_ALREADY_ALLOCATED",
  EX_CART_ALREADY_CREATED = "EX_CART_ALREADY_CREATED",
  EX_INCORRECT_LOCATION = "EX_INCORRECT_LOCATION",
  EX_INCORRECT_TOTE = "EX_INCORRECT_TOTE",
  EX_INVALID_ITEM_LAST = "EX_INVALID_ITEM_LAST",
  EX_INVALID_ITEM_NOT_LAST = "EX_INVALID_ITEM_NOT_LAST",
  EX_SHORT_INVENTORY = "EX_SHORT_INVENTORY",
  EX_DAMAGED_ITEM = "EX_DAMAGED_ITEM",
  EX_PRESS_CTRL_W = "EX_PRESS_CTRL_W", // Go back to previous screen
  EX_PRESS_CTRL_K = "EX_PRESS_CTRL_K", // Skip a pick (exception handling only)
  EX_NOTIFY_LEAD = "EX_NOTIFY_LEAD",
  EX_ITEM_TO_AMNESTY_BIN = "EX_ITEM_TO_AMNESTY_BIN",
  EX_ITEM_TO_IC = "EX_ITEM_TO_IC",
}

/**
 * Physical warehouse zones plus the FEX (Express) task group.
 * Per DATA_CONTRACT.md §Zone
 */
export enum Zone {
  Z1 = "Z1",
  Z2 = "Z2",
  Z3 = "Z3",
  Z4 = "Z4",
  HAZ = "HAZ", // Hazardous materials zone
  FEX = "FEX", // Express orders — special task group, not a physical zone
}

/**
 * The result of a simulated scan attempt.
 * Every scan path (success, error, timeout) must be handled.
 * Per DATA_CONTRACT.md §ScanResult
 */
export enum ScanResult {
  SUCCESS = "SUCCESS",
  WRONG_ITEM = "WRONG_ITEM",
  WRONG_TOTE = "WRONG_TOTE",
  WRONG_LOCATION = "WRONG_LOCATION",
  TOTE_ALLOCATED = "TOTE_ALLOCATED",
  CART_ALLOCATED = "CART_ALLOCATED",
  ITEM_NOT_FOUND = "ITEM_NOT_FOUND",
  ITEM_DAMAGED = "ITEM_DAMAGED",
  TIMEOUT = "TIMEOUT",
}

/** Per DATA_CONTRACT.md §ContentType */
export enum ContentType {
  LAB = "LAB",
  SIMULATION = "SIMULATION",
  QUIZ = "QUIZ",
  DIRECTIVE = "DIRECTIVE",
}

/** Per DATA_CONTRACT.md §DifficultyLevel */
export enum DifficultyLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

// ─────────────────────────────────────────────────────────────────────────────
// WAREHOUSE ENTITY INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** A single shelf location in the warehouse. */
export interface WarehouseLocation {
  locationId: string
  zone: Zone
  aisle: string
  bay: string
  level: string
  /** What shows on RF Device display, e.g. "316-001-A1" */
  displayLabel: string
  /** 2 or 3-digit shelf check digit for physical verification, e.g. "18", "47", "83" */
  checkDigit?: string
  /** Scannable location barcode, e.g. "LOC-316-01-A-01" */
  barcode?: string
}

/** An item/product in inventory. */
export interface WarehouseItem {
  itemId: string
  sku: string
  /** The barcode value scanned on the physical item */
  upcBarcode: string
  description: string
  /** "Unit", "Case", etc. */
  unitOfMeasure: string
  /** RF Device shows "Item (Last 4): XXXX" */
  lastFourDigits: string
  /** For simulation visual fidelity */
  imageUrl?: string
}

/**
 * One slot position on the Pick Cart.
 * A cart always holds exactly 9 totes. Per BBWD-WI-030 §5.1.
 */
export type ToteSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** A single pick task — one unit of work for the picker. Per BBWD-WI-030 §5.2. */
export interface PickTask {
  pickTaskId: string
  orderNumber: string
  item: WarehouseItem
  location: WarehouseLocation
  quantityRequired: number
  /** Which tote this item belongs in */
  targetToteId: string
  /** Which slot on the cart */
  targetSlot: ToteSlot
  /** FEX order requires "FEX" task group scan */
  isExpress: boolean
}

/** A tote (one of 9 on the Pick Cart). */
export interface Tote {
  toteId: string
  /** Scannable barcode value, e.g. "T00000000011692" */
  barcode: string
  slot: ToteSlot
  pickedItems: PickedItem[]
  /** True after CTRL+A confirmation — Per BBWD-WI-030 §5.2.15 */
  isComplete: boolean
  placedOnConveyor: boolean
}

/** A successfully picked item recorded in a tote. */
export interface PickedItem {
  pickTaskId: string
  item: WarehouseItem
  quantityPicked: number
  scannedAt: Date
}

/**
 * The Pick Cart for an active picking round.
 * Per BBWD-WI-030 §5.1: always 9 totes.
 */
export interface PickCart {
  cartId: string
  /** Scannable cart barcode, e.g. "C000000083" */
  cartBarcode: string
  /** Always length 9 — one Tote per ToteSlot */
  totes: Tote[]
  zone: Zone
  taskGroup: string
  roundNumber: number
  totalItemsPicked: number
  /** True after CTRL+E — Per BBWD-WI-030 §5.1.15 */
  isBuilt: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** A single scan event (simulated). Every scan is logged — including failures. */
export interface ScanEvent {
  scanEventId: string
  sessionId: string
  step: WorkflowStep
  /** The correct barcode value the system expected */
  expectedValue: string
  /** What the user actually submitted */
  scannedValue: string
  result: ScanResult
  timestamp: Date
  responseTimeMs: number
}

/**
 * An error that occurred during simulation.
 * Per DATA_CONTRACT.md §SimulationError
 */
export interface SimulationError {
  errorId: string
  sessionId: string
  step: WorkflowStep
  errorType: ScanResult
  /** True if the error was deliberately injected by the scenario */
  injected: boolean
  corrected: boolean
  correctionSteps: WorkflowStep[]
  occurredAt: Date
  /**
   * For WRONG_ITEM errors: whether this was the last item at the pick location.
   * Drives routing at PK_PLACE_TOTE_ON_CONVEYOR:
   * true → EX_ITEM_TO_AMNESTY_BIN, false → EX_ITEM_TO_IC.
   * Per BBWD-WI-030 §6.5.1 vs §6.5.2
   */
  isLastItemAtLocation?: boolean
  /**
   * Zero-based index into pickQueue at which this error occurred.
   * Used by the re-injection guard to prevent the same injected error
   * from firing twice at the same pick index.
   * Per SIMULATION.md §Error Injection System
   */
  pickIndex?: number
}

/**
 * A complete simulation session.
 * Session state is IMMUTABLE — every dispatch returns a new object.
 * Per SIMULATION.md §Critical Engine Rules
 */
export interface SimulationSession {
  sessionId: string
  userId: string
  moduleId: string
  moduleType: ContentType
  difficulty: DifficultyLevel

  // Cart state
  cart: PickCart
  /**
   * Barcodes of the loose pick totes the picker obtained and loaded onto the
   * cart (BBWD-WI-030 §5.1.4) that have not yet been scanned into a slot.
   *
   * Build Cart consumes this stack: §5.1.13 has the RF Device name the SLOT,
   * and the picker scans whichever tote they grabbed off the stack into it.
   * A tote is removed from here and written onto `cart.totes[slot]` on a
   * successful scan, so an empty stack means every slot has been assigned.
   */
  toteStack: string[]
  pickQueue: PickTask[]
  completedPicks: PickedItem[]

  // Progress tracking
  currentStep: WorkflowStep
  currentPickIndex: number
  /** 1-based; tracks which tote slot is being scanned during Build Cart */
  currentToteSlot: ToteSlot

  // Events
  scanEvents: ScanEvent[]
  errors: SimulationError[]

  // Industrial & 4-Beat Telemetry
  /** Number of times trainee attempted an out-of-order action (e.g. SKU scan before check digit) */
  sequenceBypasses?: number
  /** Number of check digits or bin locations successfully verified */
  checkDigitsVerified?: number
  /** Timestamp when current step prompt appeared on RF screen (for cognitive latency calculation) */
  stepPromptTimestamp?: number
  /** Total cognitive latency in ms accumulated across all location-to-first-action prompts */
  totalCognitiveLatencyMs?: number

  // Timing
  startedAt: Date
  completedAt?: Date
  totalTimeMs?: number

  // Outcome
  score?: SessionScore
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED"
}

/** Final score for a completed simulation session. Per CLAUDE.md §Simulations. */
export interface SessionScore {
  sessionId: string
  totalPicks: number
  /** 0–1 — ratio of correct first-scan picks */
  correctFirstScanRate: number
  errorCount: number
  correctedErrorCount: number
  averageResponseTimeMs: number
  /** 0–100 */
  accuracyScore: number
  /** 0–100 */
  speedScore: number
  /** (accuracy × 0.6) + (speed × 0.4) per CLAUDE.md scoring formula */
  finalScore: number
  passed: boolean
  passingThreshold: number

  // 4-Beat & Day 1 Telemetry
  /** 0–100% — percentage of picks where check digit was properly validated before SKU scan */
  checkDigitScanRate?: number
  /** 0–100% — First-Time Pick Accuracy */
  firstTimePickAccuracy?: number
  /** Mean cognitive latency in ms between RF location prompt and first valid scan */
  cognitiveLatencyMs?: number
  /** Total sequence bypass violations logged */
  sequenceBypasses?: number
  /** Programmatic Day 1 qualification gate status */
  day1Passed?: boolean
}

/**
 * Performance band derived from finalScore vs passingThreshold.
 *
 *   EXCELLENT:   finalScore >= 90
 *   PASS:        finalScore >= passThreshold && < 90
 *   BORDERLINE:  finalScore >= passThreshold - 10 && < passThreshold
 *   FAIL:        finalScore < passThreshold - 10
 */
export type ScoreBand = "EXCELLENT" | "PASS" | "BORDERLINE" | "FAIL"

/**
 * Rich result object computed at simulation completion.
 * Extends the raw SessionScore with performance band, specific feedback,
 * and context needed for the results screen display.
 *
 * Produced by computeSessionResult() in scorer.ts.
 */
export interface SessionResult {
  // ── Core scores ──────────────────────────────────────────────────────────
  finalScore: number
  accuracyScore: number
  speedScore: number
  passed: boolean

  // ── Raw stats ─────────────────────────────────────────────────────────────
  totalPicks: number
  /** Number of scans correct on first attempt */
  correctFirstScans: number
  errorCount: number
  /** Elapsed time in seconds */
  durationSeconds: number
  /** ScanResult types from injected error scenarios that were triggered */
  errorsEncountered: ScanResult[]
  /** Count of injected errors resolved correctly */
  exceptionsResolved: number

  // ── 4-Beat & Day 1 Metrics ────────────────────────────────────────────────
  checkDigitScanRate?: number
  firstTimePickAccuracy?: number
  cognitiveLatencyMs?: number
  sequenceBypasses?: number
  day1Passed?: boolean

  // ── Derived ───────────────────────────────────────────────────────────────
  band: ScoreBand

  // ── Feedback (generated by generateFeedback) ─────────────────────────────
  strengths: string[]
  improvements: string[]

  // ── Context for display ─────────────────────────────────────────────────
  passThreshold: number
  difficulty: DifficultyLevel
  zone: Zone
  scenarioTitle: string
}

// ─────────────────────────────────────────────────────────────────────────────
// RF DEVICE SCREEN INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents what is displayed on the RF Device screen.
 * The engine generates these; the UI only renders them.
 * Per SIMULATION.md §RF Device Screen Generator
 */
export interface RFDeviceScreen {
  screenId: string
  workflowStep: WorkflowStep
  /** Real RF Device supports ~6 lines */
  lines: RFScreenLine[]
  /** Which field has cursor/input focus */
  activeField?: string
  /**
   * How the RF Device expects input at this screen:
   *   "TEXT"              — keyboard text entry
   *   "BARCODE"           — scanner (side-trigger or SCAN button)
   *   "NUMERIC"           — numeric keypad
   *   "KEYBOARD_SHORTCUT" — soft-key only; e.g. CTRL+A on End Of Tote
   */
  inputType?: "TEXT" | "BARCODE" | "NUMERIC" | "KEYBOARD_SHORTCUT"
  /** Dynamic data for the screen, e.g. { toteId, location, item } */
  contextualData?: Record<string, string>
}

/** A single display line on the RF Device screen. */
export interface RFScreenLine {
  label?: string
  value?: string
  /** Location shown in red/highlighted on the real device */
  isHighlighted?: boolean
  isCursorField?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** A step in a lab or simulation module. */
export interface ContentStep {
  stepId: string
  order: number
  workflowStep: WorkflowStep
  /** What to do */
  instruction: string
  /** Why (labs only — not shown during simulations) */
  explanation?: string
  /** Available on request (labs only) */
  hint?: string
  expectedAction: ExpectedAction
  /** e.g. "BBWD-WI-030 §5.2.9" */
  sopReference?: string
}

/** What the system expects the user to do at a given step. */
export type ExpectedAction =
  | { type: "SCAN"; expectedBarcode: string }
  | { type: "KEY_INPUT"; expectedKeys: string } // e.g. "CTRL+E"
  | { type: "TYPE"; expectedText: string }
  | { type: "CONFIRM"; message: string }

/**
 * An injected error scenario within a simulation.
 * Minimum 2 per simulation — non-negotiable per CLAUDE.md §Simulations.
 */
export interface ErrorScenario {
  scenarioId: string
  injectAtPickIndex: number
  errorType: ScanResult
  description: string
  expectedResolution: WorkflowStep[]
  sopReference: string
  /**
   * For WRONG_ITEM injections: true if this is the last item at the pick location.
   * Determines whether resolution routes to EX_INVALID_ITEM_LAST or EX_INVALID_ITEM_NOT_LAST.
   * Per BBWD-WI-030 §6.5
   */
  isLastItemAtLocation?: boolean
}

/** A lab module definition. Per CONTENT_SCHEMA.md §Lab Module Schema. */
export interface LabModule {
  moduleId: string
  title: string
  description: string
  contentType: ContentType.LAB
  difficulty: DifficultyLevel
  estimatedMinutes: number
  prerequisites: string[]
  steps: ContentStep[]
  passCriteria: {
    minScore?: number
    requiredSteps: string[]
  }
  sopDocuments: string[]
  version: string
  lastUpdated: string
}

/** A simulation scenario definition. Per CONTENT_SCHEMA.md §Simulation Scenario Schema. */
export interface SimulationScenario {
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
  /** Minimum 2 per simulation */
  errorScenarios: ErrorScenario[]
  passCriteria: {
    minScore: number
    maxErrors: number
  }
  scoringWeights: {
    accuracy: number
    speed: number
  }
  /**
   * Target picks per hour for speed scoring.
   * Per CLAUDE.md: TBD — confirm actual benchmark with GEODIS operations.
   * Defaults to 150 in scorer if not set.
   */
  targetPicksPerHour?: number
  version: string
  lastUpdated: string
}

/** A quiz question. Per CONTENT_SCHEMA.md §Quiz Question Bank Schema. */
export interface QuizQuestion {
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

// ─────────────────────────────────────────────────────────────────────────────
// USER & PROGRESS INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** A platform user (picker/trainee). */
export interface TraineeUser {
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

/** Progress record per module. */
export interface ModuleProgress {
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

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE API INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The result returned by every engine dispatch.
 * Per SIMULATION.md §Engine API
 */
export interface EngineResult {
  success: boolean
  newStep: WorkflowStep
  scanResult?: ScanResult
  /** Coaching message shown on error */
  feedback?: string
  sessionComplete?: boolean
  score?: SessionScore
}

/**
 * An action submitted to the engine.
 * All UI interaction flows through dispatch() with one of these action types.
 */
export type EngineAction =
  | { type: "SCAN"; value: string }
  | { type: "KEY_PRESS"; keys: string }
  | { type: "CONFIRM"; step: WorkflowStep }
  | { type: "TYPE"; text: string }
