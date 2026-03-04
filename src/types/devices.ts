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
  /** Number of character columns on the physical display */
  displayColumns: number
  /** Number of text rows on the physical display */
  displayRows: number
  /** True if device has a physical CTRL key; false if soft-key overlay needed */
  hasPhysicalCtrlKey: boolean
  /** True if device accepts touch events (soft keys rendered on screen) */
  hasTouchscreen: boolean
  /** CSS class for the terminal colour theme (e.g. "theme-green", "theme-white") */
  terminalTheme: "theme-green" | "theme-white" | "theme-amber"
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
    terminalTheme: "theme-green",
  },

  /** Zebra TC52 — 24×10 white display, touchscreen, no physical CTRL keys. */
  ZEBRA_TC52: {
    modelId: "ZEBRA_TC52",
    displayName: "Zebra TC52",
    displayColumns: 24,
    displayRows: 10,
    hasPhysicalCtrlKey: false,
    hasTouchscreen: true,
    terminalTheme: "theme-white",
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
    terminalTheme: "theme-green",
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
export const ACTIVE_DEVICE_MODEL_ID = "GENERIC_TERMINAL"

/** Convenience: the active RFDeviceModel object derived from the ID above. */
export const ACTIVE_DEVICE: RFDeviceModel =
  RF_DEVICE_MODELS[ACTIVE_DEVICE_MODEL_ID]
