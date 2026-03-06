/**
 * domain.ts — Core domain types for WarehousePro
 *
 * Every type used across the simulation engine, content system,
 * API, and UI is defined here. No imports from React or Next.js.
 *
 * Source: BBWD-WI-030 §5.1, §5.2, §6 | BBWD-VJA-030
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * Every picker action maps to exactly one WorkflowStep.
 * This is the atomic unit of the entire platform.
 * Content, simulations, quiz questions, and progress records
 * all reference WorkflowStep values.
 */
export enum WorkflowStep {
  // ── BUILD CART (BBWD-WI-030 §5.1) ────────────────────────────────────────
  BC_TRAVEL_TO_COMMAND_CENTER  = "BC_TRAVEL_TO_COMMAND_CENTER",
  BC_RECEIVE_TOTE_COUNT        = "BC_RECEIVE_TOTE_COUNT",
  BC_OBTAIN_CART               = "BC_OBTAIN_CART",
  BC_LOAD_TOTES                = "BC_LOAD_TOTES",
  BC_LOGIN_RF                  = "BC_LOGIN_RF",
  BC_SELECT_BBWD               = "BC_SELECT_BBWD",          // Type "1" §5.1.6
  BC_SELECT_OUTBOUND           = "BC_SELECT_OUTBOUND",      // Type "2" §5.1.7
  BC_PRESS_CTRL_T              = "BC_PRESS_CTRL_T",         // Change task group §5.1.8
  BC_CONFIRM_TASK_GROUP        = "BC_CONFIRM_TASK_GROUP",   // Enter × 2 §5.1.8
  BC_SCAN_ZONE_TASK_GROUP      = "BC_SCAN_ZONE_TASK_GROUP", // Scan zone barcode §5.1.9
  BC_SELECT_MAKE_TOTE_CART     = "BC_SELECT_MAKE_TOTE_CART",// Type "1" §5.1.10 (US)
  BC_SCAN_CART_BARCODE         = "BC_SCAN_CART_BARCODE",    // §5.1.12
  BC_PLACE_TOTE_IN_SLOT        = "BC_PLACE_TOTE_IN_SLOT",  // Physical §5.1.13
  BC_SCAN_TOTE_BARCODE         = "BC_SCAN_TOTE_BARCODE",   // §5.1.13 — repeats × 9
  BC_PRESS_CTRL_E              = "BC_PRESS_CTRL_E",         // Finalize cart §5.1.15

  // ── PICK (BBWD-WI-030 §5.2) ───────────────────────────────────────────────
  PK_PICKUP_CART               = "PK_PICKUP_CART",
  PK_LOGIN_RF                  = "PK_LOGIN_RF",
  PK_SELECT_BBWD               = "PK_SELECT_BBWD",
  PK_SELECT_OUTBOUND           = "PK_SELECT_OUTBOUND",
  PK_READ_PICK_DISPLAY         = "PK_READ_PICK_DISPLAY",    // §5.2.5
  PK_TRAVEL_TO_LOCATION        = "PK_TRAVEL_TO_LOCATION",  // §5.2.6
  PK_VERIFY_LOCATION           = "PK_VERIFY_LOCATION",     // §5.2.7
  PK_VERIFY_ITEM               = "PK_VERIFY_ITEM",         // §5.2.8
  PK_SCAN_ITEM_UPC             = "PK_SCAN_ITEM_UPC",       // §5.2.9
  PK_PICK_QUANTITY             = "PK_PICK_QUANTITY",       // §5.2.9.1
  PK_PLACE_IN_TOTE             = "PK_PLACE_IN_TOTE",       // §5.2.9.2
  PK_ENTER_QUANTITY            = "PK_ENTER_QUANTITY",      // §5.2.9.3
  PK_SCAN_TOTE_BARCODE         = "PK_SCAN_TOTE_BARCODE",  // §5.2.10
  PK_END_OF_TOTE_DISPLAY       = "PK_END_OF_TOTE_DISPLAY",// §5.2.11
  PK_PRESS_CTRL_A              = "PK_PRESS_CTRL_A",        // §5.2.12
  PK_PLACE_TOTE_ON_CONVEYOR    = "PK_PLACE_TOTE_ON_CONVEYOR", // §5.2.13

  // ── PICK STAGE (wrap-up) ──────────────────────────────────────────────────
  PS_CONTINUE_NEXT_TOTE        = "PS_CONTINUE_NEXT_TOTE",
  PS_TRASH_PICKUP              = "PS_TRASH_PICKUP",        // §5.2.15
  PS_LAST_ITEM_IN_BOX          = "PS_LAST_ITEM_IN_BOX",   // §5.2.15.1
  PS_LAST_ITEM_ON_PALLET       = "PS_LAST_ITEM_ON_PALLET",// §5.2.15.2
  PS_ROUND_COMPLETE            = "PS_ROUND_COMPLETE",

  // ── EXCEPTION HANDLING (BBWD-WI-030 §6) ───────────────────────────────────
  EX_TOTE_ALREADY_ALLOCATED    = "EX_TOTE_ALREADY_ALLOCATED",   // §6.1
  EX_CART_ALREADY_CREATED      = "EX_CART_ALREADY_CREATED",     // §6.2
  EX_INCORRECT_LOCATION        = "EX_INCORRECT_LOCATION",       // §6.3
  EX_INCORRECT_TOTE            = "EX_INCORRECT_TOTE",           // §6.4
  EX_INVALID_ITEM_LAST         = "EX_INVALID_ITEM_LAST",        // §6.5.1
  EX_INVALID_ITEM_NOT_LAST     = "EX_INVALID_ITEM_NOT_LAST",    // §6.5.2
  EX_SHORT_INVENTORY           = "EX_SHORT_INVENTORY",          // §6.6
  EX_DAMAGED_ITEM              = "EX_DAMAGED_ITEM",             // §6.7
  EX_PRESS_CTRL_W              = "EX_PRESS_CTRL_W",             // Go back
  EX_PRESS_CTRL_K              = "EX_PRESS_CTRL_K",             // Skip pick
  EX_NOTIFY_LEAD               = "EX_NOTIFY_LEAD",
  EX_ITEM_TO_AMNESTY_BIN       = "EX_ITEM_TO_AMNESTY_BIN",
  EX_ITEM_TO_IC                = "EX_ITEM_TO_IC",
}

export enum Zone {
  Z1  = "Z1",
  Z2  = "Z2",
  Z3  = "Z3",
  Z4  = "Z4",
  HAZ = "HAZ", // Hazardous materials zone
  FEX = "FEX", // Express orders — task group, not a physical zone
}

export enum ScanResult {
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

export enum ContentType {
  LAB        = "LAB",
  SIMULATION = "SIMULATION",
  QUIZ       = "QUIZ",
  DIRECTIVE  = "DIRECTIVE",
}

export enum Difficulty {
  BEGINNER     = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED     = "ADVANCED",
}

export enum SessionStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED   = "COMPLETED",
  ABANDONED   = "ABANDONED",
}

export enum UserRole {
  PICKER     = "PICKER",
  LEAD       = "LEAD",
  SUPERVISOR = "SUPERVISOR",
  ADMIN      = "ADMIN",
}

/** The 9 physical tote slots on a picking cart */
export type ToteSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// ─── Warehouse Entities ───────────────────────────────────────────────────────

export interface WarehouseLocation {
  locationId:   string;     // e.g. "316-001-A1"
  zone:         Zone;
  aisle:        string;
  bay:          string;
  level:        string;
  displayLabel: string;     // What shows on RF Device
}

export interface WarehouseItem {
  itemId:          string;
  sku:             string;
  upcBarcode:      string;  // 12-digit UPC-A — what gets scanned on the item
  description:     string;
  unitOfMeasure:   string;  // "Unit", "Case", etc.
  lastFourDigits:  string;  // RF Device shows "Item (Last 4): XXXX"
  weight?:         number;  // kg — optional, for future weight validation
  isHazardous?:    boolean; // True for HAZ zone items
  imageUrl?:       string;  // For simulation visual fidelity
}

export interface PickedItem {
  pickTaskId:    string;
  item:          WarehouseItem;
  quantityPicked: number;
  scannedAt:     Date;
}

/** A single pick task — one unit of work for the picker */
export interface PickTask {
  pickTaskId:       string;
  orderNumber:      string;
  item:             WarehouseItem;
  location:         WarehouseLocation;
  quantityRequired: number;
  targetToteId:     string;   // Which tote this item belongs in
  targetSlot:       ToteSlot; // Which slot on the cart
  isExpress:        boolean;  // FEX order
}

/** A tote — one of 9 on the cart */
export interface Tote {
  toteId:           string;   // e.g. "T00000000011692"
  barcode:          string;   // Scannable barcode value
  slot:             ToteSlot;
  pickedItems:      PickedItem[];
  isComplete:       boolean;  // True after CTRL+A confirmation
  placedOnConveyor: boolean;
}

/** The picking cart for an active session */
export interface PickCart {
  cartId:           string;
  cartBarcode:      string;   // e.g. "C000000083"
  totes:            Tote[];   // Always length 9
  zone:             Zone;
  taskGroup:        string;
  roundNumber:      number;
  totalItemsPicked: number;
  isBuilt:          boolean;  // True after CTRL+E
}

// ─── Simulation Session ───────────────────────────────────────────────────────

export interface ScanEvent {
  scanEventId:      string;
  sessionId:        string;
  step:             WorkflowStep;
  expectedValue:    string;
  scannedValue:     string;
  result:           ScanResult;
  timestamp:        Date;
  responseTimeMs:   number;
}

export interface SimulationError {
  errorId:          string;
  sessionId:        string;
  step:             WorkflowStep;
  errorType:        ScanResult;
  injected:         boolean;    // True if deliberately injected by scenario
  corrected:        boolean;
  correctionSteps:  WorkflowStep[];
  occurredAt:       Date;
}

export interface SimulationSession {
  sessionId:        string;
  userId:           string;
  moduleId:         string;
  moduleType:       ContentType;
  difficulty:       Difficulty;

  // Cart + pick state
  cart:             PickCart;
  pickQueue:        PickTask[];
  completedPicks:   PickedItem[];

  // Progress tracking
  currentStep:      WorkflowStep;
  currentPickIndex: number;
  currentToteSlot:  ToteSlot;

  // Events
  scanEvents:       ScanEvent[];
  errors:           SimulationError[];

  // Timing
  startedAt:        Date;
  completedAt?:     Date;
  totalTimeMs?:     number;

  // Outcome
  score?:           SessionScore;
  status:           SessionStatus;
}

export interface SessionScore {
  sessionId:             string;
  totalPicks:            number;
  correctFirstScanRate:  number;  // 0–1
  errorCount:            number;
  correctedErrorCount:   number;
  averageResponseTimeMs: number;
  accuracyScore:         number;  // 0–100
  speedScore:            number;  // 0–100, capped
  finalScore:            number;  // accuracy×0.6 + speed×0.4
  passed:                boolean;
  passingThreshold:      number;
}

// ─── RF Device Screen ─────────────────────────────────────────────────────────

/** What's displayed on the RF Device screen for a given WorkflowStep */
export interface RFDeviceScreen {
  screenId:     string;
  workflowStep: WorkflowStep;
  lines:        RFScreenLine[];    // Max ~8 lines depending on device model
  activeField?: string;
  inputType?:   "BARCODE" | "NUMERIC" | "TEXT" | "KEYBOARD_SHORTCUT" | "NONE";
  contextData?: Record<string, string>;
}

export interface RFScreenLine {
  label?:         string;
  value?:         string;
  isHighlighted?: boolean;  // Location row shown in red on real device
  isCursorField?: boolean;
  isEmpty?:       boolean;  // Blank line for spacing
}

// ─── Engine Types ─────────────────────────────────────────────────────────────

export interface EngineAction {
  type:  "SCAN" | "KEY_PRESS" | "CONFIRM_PHYSICAL";
  value: string;
}

export interface EngineResult {
  session:          SimulationSession;
  success:          boolean;
  scanResult?:      ScanResult;
  feedback?:        string;       // Coaching message shown on error
  sessionComplete?: boolean;
  score?:           SessionScore;
}

// ─── Content Types ────────────────────────────────────────────────────────────

export type ExpectedAction =
  | { type: "SCAN";    expectedBarcode: string }
  | { type: "KEY_INPUT"; expectedKeys: string }
  | { type: "TYPE";    expectedText: string }
  | { type: "CONFIRM"; message: string };

export interface ContentStep {
  stepId:        string;
  order:         number;
  workflowStep:  WorkflowStep;
  instruction:   string;
  explanation?:  string;   // Labs only — the "why"
  hint?:         string;   // Labs only — available on request
  expectedAction: ExpectedAction;
  sopReference?: string;  // e.g. "BBWD-WI-030 §5.2.9"
}

export interface ErrorScenario {
  scenarioId:           string;
  injectAtPickIndex:    number;
  errorType:            ScanResult;
  isLastItemAtLocation?: boolean;
  description:          string;
  expectedResolution:   WorkflowStep[];
  sopReference:         string;
}

export interface SimulationScenario {
  moduleId:           string;
  title:              string;
  description:        string;
  contentType:        ContentType.SIMULATION;
  difficulty:         Difficulty;
  estimatedMinutes:   number;
  zone:               Zone;
  pickCount:          number;
  toteCount:          9; // always 9
  targetPicksPerHour?: number; // facility benchmark — TBD
  steps:              ContentStep[];
  errorScenarios:     ErrorScenario[];   // min 2
  passCriteria: {
    minScore:  number;  // 60–90
    maxErrors: number;
  };
  scoringWeights: {
    accuracy: number;   // 0.6
    speed:    number;   // 0.4
  };
  version:     string;
  lastUpdated: string;
}

export interface LabModule {
  moduleId:         string;
  title:            string;
  description:      string;
  contentType:      ContentType.LAB;
  difficulty:       Difficulty;
  estimatedMinutes: number;
  prerequisites:    string[];
  steps:            ContentStep[];
  passCriteria: {
    minScore?:     number;
    requiredSteps: string[];
  };
  sopDocuments: string[];
  version:      string;
  lastUpdated:  string;
}

export interface QuizQuestion {
  questionId:        string;
  workflowStep:      WorkflowStep;
  sopReference:      string;
  questionText:      string;
  questionType:      "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SCENARIO";
  options:           string[];
  correctOptionIndex: number;
  explanation:       string;
  difficulty:        Difficulty;
  tags:              string[];
}

// ─── User & Progress ──────────────────────────────────────────────────────────

export interface TraineeUser {
  userId:           string;
  employeeId:       string;
  name:             string;
  facilityId:       string;
  role:             UserRole;
  startDate:        Date;
  completedModules: string[];
  currentModuleId?: string;
}

export interface ModuleProgress {
  progressId:   string;
  userId:       string;
  moduleId:     string;
  attempts:     number;
  bestScore?:   number;
  lastAttemptAt?: Date;
  completed:    boolean;
  completedAt?: Date;
  timeSpentMs:  number;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string; code: number };
