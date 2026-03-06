/**
 * devices.ts — RF Device model registry
 *
 * Each entry describes the physical display and input characteristics of a
 * supported RF Device model. The emulator reads this config at runtime.
 *
 * To add a new model:
 *   1. Add an entry to RF_DEVICE_MODELS below.
 *   2. That's it. The emulator, useScanner, and soft-key renderer all derive
 *      their behaviour from this registry.
 *
 * Per CLAUDE.md §RF Device Configuration
 */

/** Display and input characteristics for one RF Device model. */
export interface RFDeviceModel {
  modelId: string
  /** Human-readable name for the device picker UI */
  displayName: string
  /** Number of character columns on the simulated RF screen buffer */
  displayColumns: number
  /** Number of text rows on the simulated RF screen buffer */
  displayRows: number
  /** True if device has a physical CTRL key; false if soft-key overlay needed */
  hasPhysicalCtrlKey: boolean
  /** True if device accepts touch events (soft keys rendered on screen) */
  hasTouchscreen: boolean
  /**
   * Visual rendering style for the emulator:
   *   "terminal" — monospace CRT aesthetic (green/amber/white terminal)
   *   "android"  — clean sans-serif WMS aesthetic matching real Android WMS apps
   */
  uiStyle: "terminal" | "android"
  /**
   * CSS class for the terminal colour theme.
   * Only used when uiStyle is "terminal".
   */
  terminalTheme?: "theme-green" | "theme-white" | "theme-amber"
  /** Whether to render the soft key bar (CTRL action buttons). */
  showSoftKeys: boolean
  /**
   * Where to dock the soft key bar.
   * Only relevant when showSoftKeys is true.
   */
  softKeyPosition?: "bottom" | "top"
  /** Physical display orientation. */
  orientation?: "portrait" | "landscape"
  /**
   * Approximate emulator container width in CSS px.
   * Used by the emulator to constrain layout to a realistic device width.
   */
  emulatorWidthPx?: number
  /**
   * Minimum touch-target height in CSS px.
   * Enforced on all interactive elements for gloved-finger operation.
   * Per CLAUDE.md §RF Device Configuration — TC520K requires ≥ 56 px.
   */
  minTouchTargetPx?: number
  /**
   * CSS font-family string for the emulator UI.
   * Terminal devices default to monospace; Android devices use sans-serif.
   */
  fontFamily?: string
}

/**
 * Registry of all supported RF Device models.
 * Per CLAUDE.md §RF Device Configuration — adding a new model only requires a
 * new entry here.
 */
export const RF_DEVICE_MODELS: Readonly<Record<string, RFDeviceModel>> = {
  /** Honeywell CK65 — 20×8 green terminal, physical keypad, no touchscreen. */
  HONEYWELL_CK65: {
    modelId: "HONEYWELL_CK65",
    displayName: "Honeywell CK65",
    displayColumns: 20,
    displayRows: 8,
    hasPhysicalCtrlKey: true,
    hasTouchscreen: false,
    uiStyle: "terminal",
    terminalTheme: "theme-green",
    showSoftKeys: false,
    orientation: "landscape",
    emulatorWidthPx: 480,
    minTouchTargetPx: 44,
    fontFamily: "'Courier New', Courier, monospace",
  },

  /**
   * Zebra TC52 — 24×10 white display, touchscreen, no physical CTRL keys.
   * Legacy model; superseded by ZEBRA_TC520K as the confirmed primary device.
   * Retained for legacy support and fallback use.
   */
  ZEBRA_TC52: {
    modelId: "ZEBRA_TC52",
    displayName: "Zebra TC52 (Legacy)",
    displayColumns: 24,
    displayRows: 10,
    hasPhysicalCtrlKey: false,
    hasTouchscreen: true,
    uiStyle: "terminal",
    terminalTheme: "theme-white",
    showSoftKeys: true,
    softKeyPosition: "bottom",
    orientation: "portrait",
    emulatorWidthPx: 360,
    minTouchTargetPx: 44,
    fontFamily: "'Courier New', Courier, monospace",
  },

  /**
   * Zebra TC520K — CONFIRMED primary GEODIS hardware (confirmed March 2026).
   *
   * Physical specs:
   *   - 5-inch FHD display (1080×1920), Android OS
   *   - Portrait orientation; ~390 px wide in the emulator
   *   - No physical keyboard; no hardware CTRL keys
   *   - Integrated SE4710 area-imager barcode scanner
   *   - Scanner fires via physical side trigger (emulated as SCAN button or
   *     auto-focus on input field + Enter to submit)
   *
   * Emulator behaviour:
   *   - Android WMS aesthetic: white/light-gray background, dark text,
   *     system sans-serif font (Roboto/Inter) — NOT a monospace terminal
   *   - All-touch input; CTRL shortcuts rendered as soft key bar (fixed bottom)
   *   - Soft key bar: 5 buttons — CTRL+T, CTRL+E, CTRL+A, CTRL+W, CTRL+K
   *   - Buttons disabled/grayed when not valid for the current WorkflowStep
   *   - Minimum touch target ≥ 56 px height for gloved-finger operation
   *
   * Per CLAUDE.md §RF Device Configuration
   */
  ZEBRA_TC520K: {
    modelId: "ZEBRA_TC520K",
    displayName: "Zebra TC520K",
    displayColumns: 24,
    displayRows: 12,
    hasPhysicalCtrlKey: false,
    hasTouchscreen: true,
    uiStyle: "android",
    showSoftKeys: true,
    softKeyPosition: "bottom",
    orientation: "portrait",
    emulatorWidthPx: 390,
    minTouchTargetPx: 56,
    fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
  },

  /**
   * Generic Terminal — fallback / unconfirmed device.
   * Used until GEODIS IT confirms the deployed hardware model.
   * Per CLAUDE.md: Change ACTIVE_DEVICE_MODEL_ID once hardware is confirmed.
   */
  GENERIC_TERMINAL: {
    modelId: "GENERIC_TERMINAL",
    displayName: "Generic Terminal",
    displayColumns: 20,
    displayRows: 8,
    hasPhysicalCtrlKey: true,
    hasTouchscreen: false,
    uiStyle: "terminal",
    terminalTheme: "theme-green",
    showSoftKeys: false,
    orientation: "landscape",
    emulatorWidthPx: 480,
    minTouchTargetPx: 44,
    fontFamily: "'Courier New', Courier, monospace",
  },
}

/**
 * The device model currently in use across the entire application.
 *
 * Change this value once GEODIS IT confirms the deployed hardware model.
 * Per CLAUDE.md §RF Device Configuration
 *
 * @see RF_DEVICE_MODELS
 */
export const ACTIVE_DEVICE_MODEL_ID = "ZEBRA_TC520K"

/** Convenience: the active RFDeviceModel object derived from the ID above. */
export const ACTIVE_DEVICE: RFDeviceModel =
  RF_DEVICE_MODELS[ACTIVE_DEVICE_MODEL_ID]
