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

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN / LAYOUT CONFIG TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All CSS color / font values for the emulator screen display area.
 * Components must read these values — never hardcode colors or fonts.
 */
export interface RFDeviceScreenConfig {
  /** CSS color for the screen background. */
  bgColor: string
  /** CSS color for normal body text. */
  textColor: string
  /** CSS font-family string for all screen text. */
  fontFamily: string
  /** CSS color for lines where isHighlighted=true (e.g. item name, warnings). */
  highlightColor: string
  /** CSS color for the cursor / active input field. */
  cursorColor: string
  /** CSS color for label text (left-side field labels). */
  labelColor: string
  /**
   * CSS font-size for screen text.
   * Defaults to "13px" when omitted — matches ~20-char terminal grid.
   */
  fontSize?: string
  /**
   * CSS line-height for screen text rows.
   * Defaults to "1.4" when omitted.
   */
  lineHeight?: string
}

/**
 * Chrome / bezel layout config for the outer device shell.
 */
export interface RFDeviceLayoutConfig {
  /** Whether to render the outer device bezel chrome. */
  showBezel: boolean
  /** CSS background color for the device bezel body. */
  bezelColor: string
  /** CSS border color for the inner screen frame. */
  screenBorderColor: string
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE MODEL
// ─────────────────────────────────────────────────────────────────────────────

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
   *   "modern"   — WarehousePro modern view with structured label/value rows
   */
  uiStyle: "terminal" | "android" | "modern"
  /**
   * CSS class for the terminal colour theme.
   * @deprecated Use screen.bgColor / screen.textColor instead.
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
   * CSS font-family string.
   * @deprecated Access via screen.fontFamily instead.
   */
  fontFamily?: string
  /** Screen color / typography configuration. Read these in all components. */
  screen: RFDeviceScreenConfig
  /** Outer bezel / chrome layout configuration. */
  layout: RFDeviceLayoutConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registry of all supported RF Device models.
 * Per CLAUDE.md §RF Device Configuration — adding a new model only requires a
 * new entry here.
 */
export const RF_DEVICE_MODELS: Readonly<Record<string, RFDeviceModel>> = {
  /** Honeywell CK65 — 20×8 green terminal, physical keypad, no touchscreen. */
  HONEYWELL_CK65: {
    modelId: "HONEYWELL_CK65",
    displayName: "Honeywell CK65 (Terminal)",
    displayColumns: 20,
    displayRows: 8,
    hasPhysicalCtrlKey: true,
    hasTouchscreen: false,
    uiStyle: "terminal",
    terminalTheme: "theme-green",
    showSoftKeys: false,
    orientation: "landscape",
    emulatorWidthPx: 300,
    minTouchTargetPx: 44,
    fontFamily: "'Courier New', Courier, monospace",
    screen: {
      bgColor: "#0a0e0a",
      textColor: "#33ff33",
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      highlightColor: "#ffff00",
      cursorColor: "#33ff33",
      labelColor: "#33ff33",
      fontSize: "13px",
      lineHeight: "1.4",
    },
    layout: {
      showBezel: true,
      bezelColor: "#1c1c1c",
      screenBorderColor: "#1a3d1a",
    },
  },

  /**
   * Zebra TC52 — 24×10 amber-on-dark display, touchscreen, no physical CTRL.
   * Legacy model; superseded by ZEBRA_TC520K as the confirmed primary device.
   */
  ZEBRA_TC52: {
    modelId: "ZEBRA_TC52",
    displayName: "Zebra TC52 (Legacy)",
    displayColumns: 20,
    displayRows: 10,
    hasPhysicalCtrlKey: false,
    hasTouchscreen: true,
    uiStyle: "terminal",
    terminalTheme: "theme-white",
    showSoftKeys: true,
    softKeyPosition: "bottom",
    orientation: "portrait",
    emulatorWidthPx: 300,
    minTouchTargetPx: 44,
    fontFamily: "'Courier New', Courier, monospace",
    screen: {
      bgColor: "#111827",
      textColor: "#f9fafb",
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      highlightColor: "#fde047",
      cursorColor: "#d1d5db",
      labelColor: "#f9fafb",
      fontSize: "13px",
      lineHeight: "1.4",
    },
    layout: {
      showBezel: true,
      bezelColor: "#374151",
      screenBorderColor: "#4b5563",
    },
  },

  /**
   * Zebra TC520K — CONFIRMED primary GEODIS hardware (confirmed March 2026).
   *
   * Physical specs:
   *   - 5-inch FHD display (1080×1920), Android OS
   *   - Portrait orientation; ~300 px wide in the emulator
   *   - No physical keyboard; no hardware CTRL keys
   *   - SE4710 area-imager barcode scanner (side trigger)
   *
   * Emulator:
   *   - GEODIS runs Manhattan WMS on this device. Manhattan's RF client is a
   *     telnet-style terminal emulator — black bg, white/green monospace text,
   *     fixed 20-char grid — regardless of the Android hardware underneath.
   *   - Soft key bar (bottom): CTRL+T, CTRL+E, CTRL+A, CTRL+W, CTRL+K
   *     (training-only addition — not on the real device)
   *   - Min touch target ≥ 56 px for gloved operation
   *
   * Per CLAUDE.md §RF Device Configuration
   * Per BBWD-VJA-030 SOP screenshots
   */
  ZEBRA_TC520K: {
    modelId: "ZEBRA_TC520K",
    displayName: "Zebra TC520K (Manhattan WMS)",
    displayColumns: 20,
    displayRows: 12,
    hasPhysicalCtrlKey: false,
    hasTouchscreen: true,
    uiStyle: "terminal",
    showSoftKeys: true,
    softKeyPosition: "bottom",
    orientation: "portrait",
    emulatorWidthPx: 300,
    minTouchTargetPx: 56,
    fontFamily: "'Courier New', 'Lucida Console', monospace",
    screen: {
      bgColor: "#0a0a0a",
      textColor: "#e8e8e8",
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      highlightColor: "#00ff41",
      cursorColor: "#00ff41",
      labelColor: "#e8e8e8",
      fontSize: "13px",
      lineHeight: "1.4",
    },
    layout: {
      showBezel: true,
      bezelColor: "#1a1a2e",
      screenBorderColor: "#2d5a2d",
    },
  },

  /**
   * WarehousePro Modern — default training view with structured label/value
   * rows, amber accent colors, and JetBrains Mono typography.
   *
   * This is NOT a physical device — it is a training-optimized rendering of
   * the same RF Device screen data. Trainees can switch to a "Classic"
   * terminal view to see what the real device looks like.
   */
  WAREHOUSEPRO_MODERN: {
    modelId: "WAREHOUSEPRO_MODERN",
    displayName: "Modern View",
    displayColumns: 20,
    displayRows: 12,
    hasPhysicalCtrlKey: false,
    hasTouchscreen: true,
    uiStyle: "modern",
    showSoftKeys: true,
    softKeyPosition: "bottom",
    orientation: "portrait",
    emulatorWidthPx: 360,
    minTouchTargetPx: 56,
    fontFamily: "'JetBrains Mono', monospace",
    screen: {
      bgColor: "#161b22",
      textColor: "#e6edf3",
      fontFamily: "'JetBrains Mono', monospace",
      highlightColor: "#f0a500",
      cursorColor: "#f0a500",
      labelColor: "#8b949e",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    layout: {
      showBezel: true,
      bezelColor: "#0d1117",
      screenBorderColor: "#30363d",
    },
  },

  /**
   * Generic Terminal — fallback / unconfirmed device.
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
    emulatorWidthPx: 300,
    minTouchTargetPx: 44,
    fontFamily: "'Courier New', Courier, monospace",
    screen: {
      bgColor: "#050a05",
      textColor: "#22c55e",
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      highlightColor: "#fde047",
      cursorColor: "#4ade80",
      labelColor: "#22c55e",
      fontSize: "13px",
      lineHeight: "1.4",
    },
    layout: {
      showBezel: true,
      bezelColor: "#1c1c1c",
      screenBorderColor: "#14532d",
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE DEVICE + MODEL ID TYPE
// ─────────────────────────────────────────────────────────────────────────────

/** String-literal union of all registered model IDs. */
export type RFDeviceModelId =
  | "HONEYWELL_CK65"
  | "ZEBRA_TC52"
  | "ZEBRA_TC520K"
  | "WAREHOUSEPRO_MODERN"
  | "GENERIC_TERMINAL"

/**
 * The device model currently in use across the entire application.
 *
 * Change this value once GEODIS IT confirms the deployed hardware model.
 * Per CLAUDE.md §RF Device Configuration
 *
 * @see RF_DEVICE_MODELS
 */
export const ACTIVE_DEVICE_MODEL_ID: RFDeviceModelId = "WAREHOUSEPRO_MODERN"

/** Convenience: the active RFDeviceModel object derived from the ID above. */
export const ACTIVE_DEVICE: RFDeviceModel =
  RF_DEVICE_MODELS[ACTIVE_DEVICE_MODEL_ID]

/**
 * Look up a device model by ID.
 * Falls back to ACTIVE_DEVICE if the modelId is unknown or omitted.
 *
 * Use this everywhere a component needs device config at runtime so that
 * the DeviceSelector (store-driven) drives the rendered aesthetic.
 */
export function getDeviceModel(modelId?: string): RFDeviceModel {
  if (modelId && modelId in RF_DEVICE_MODELS) {
    return RF_DEVICE_MODELS[modelId]
  }
  return RF_DEVICE_MODELS[ACTIVE_DEVICE_MODEL_ID]
}
