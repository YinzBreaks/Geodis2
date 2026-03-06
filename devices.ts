/**
 * RF Device Model Registry
 *
 * Defines the display characteristics and input capabilities of each
 * supported RF terminal. To add a new device:
 *   1. Add an entry to RF_DEVICE_MODELS with a unique modelId
 *   2. No other changes required — the emulator reads this config at runtime
 *
 * Source docs: BBWD-VJA-030, BBWD-WI-030
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RFDeviceModelId =
  | "HONEYWELL_CK65"
  | "ZEBRA_TC52"
  | "GENERIC_TERMINAL" // fallback / unknown device
  | string; // extensible — new models don't require type changes

export interface RFDeviceModel {
  /** Unique identifier used throughout the app */
  modelId: RFDeviceModelId;

  /** Human-readable display name shown in the emulator UI */
  displayName: string;

  /** Manufacturer name */
  manufacturer: "Honeywell" | "Zebra" | "Datalogic" | "Generic" | string;

  /** Screen dimensions in characters (cols × rows) */
  screen: {
    cols: number; // character columns visible
    rows: number; // character rows visible
    widthPx: number; // emulator render width in pixels
    heightPx: number; // emulator render height in pixels
    fontFamily: string; // monospace font to use
    fontSizePx: number; // base font size in pixels
    lineHeightPx: number; // pixel height per row
    bgColor: string; // screen background hex
    textColor: string; // default text hex
    highlightColor: string; // highlighted field color (location row)
    cursorColor: string; // cursor/active field color
  };

  /** Physical keyboard shortcuts available on this device */
  keyboard: {
    /** Shortcuts the device supports natively as hardware keys */
    hardwareShortcuts: RFKeyShortcut[];
    /** Whether to show on-screen soft buttons for shortcuts */
    showSoftKeys: boolean;
  };

  /** Input method characteristics */
  input: {
    /** Does the device have a built-in laser/imager barcode scanner? */
    hasIntegratedScanner: boolean;
    /** Does the device support touchscreen input? */
    hasTouchscreen: boolean;
    /** Does the device have a physical numeric keypad? */
    hasNumericKeypad: boolean;
    /** Does the device have a full QWERTY keyboard? */
    hasQwerty: boolean;
  };

  /** Emulator layout hints */
  layout: {
    /** Aspect ratio class for the emulator container */
    aspectRatio: string; // e.g. "aspect-[3/5]"
    /** Whether to show a device chrome/bezel around the screen */
    showBezel: boolean;
    /** CSS classes for the bezel color */
    bezelColor: string;
    /** Where to position soft key buttons */
    softKeyPosition: "bottom" | "side" | "none";
  };
}

export interface RFKeyShortcut {
  /** Key combination as displayed to user */
  label: string; // e.g. "CTRL+E"
  /** Value passed to engine as KEY_PRESS action */
  value: string; // e.g. "CTRL+E"
  /** Brief description shown in tooltip */
  description: string;
}

// ─── Supported Shortcuts (shared across devices) ──────────────────────────────

export const RF_SHORTCUTS: Record<string, RFKeyShortcut> = {
  CTRL_T: {
    label: "CTRL+T",
    value: "CTRL+T",
    description: "Change Task Group",
  },
  CTRL_E: {
    label: "CTRL+E",
    value: "CTRL+E",
    description: "Finalize cart / begin picking",
  },
  CTRL_A: {
    label: "CTRL+A",
    value: "CTRL+A",
    description: "Accept End Of Tote",
  },
  CTRL_W: {
    label: "CTRL+W",
    value: "CTRL+W",
    description: "Go back to previous screen",
  },
  CTRL_K: {
    label: "CTRL+K",
    value: "CTRL+K",
    description: "Skip pick (exception only)",
  },
};

const ALL_SHORTCUTS = Object.values(RF_SHORTCUTS);

// ─── Device Registry ──────────────────────────────────────────────────────────

export const RF_DEVICE_MODELS: Record<RFDeviceModelId, RFDeviceModel> = {

  /**
   * Honeywell CK65
   * Rugged handheld mobile computer — common in GEODIS distribution centers.
   * 4" display, physical keypad, integrated imager.
   * Screen: ~20 cols × 8 rows in the standard WMS font.
   * Confirm exact dimensions with GEODIS IT before finalizing.
   */
  HONEYWELL_CK65: {
    modelId: "HONEYWELL_CK65",
    displayName: "Honeywell CK65",
    manufacturer: "Honeywell",
    screen: {
      cols: 20,
      rows: 8,
      widthPx: 320,
      heightPx: 240,
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      fontSizePx: 14,
      lineHeightPx: 26,
      bgColor: "#0a0a0a",
      textColor: "#00ff41", // classic green terminal
      highlightColor: "#ff4444", // red for highlighted location row
      cursorColor: "#ffff00",
    },
    keyboard: {
      hardwareShortcuts: ALL_SHORTCUTS,
      showSoftKeys: false, // physical keys available
    },
    input: {
      hasIntegratedScanner: true,
      hasTouchscreen: false,
      hasNumericKeypad: true,
      hasQwerty: true,
    },
    layout: {
      aspectRatio: "aspect-[4/3]",
      showBezel: true,
      bezelColor: "#2a2a2a",
      softKeyPosition: "none",
    },
  },

  /**
   * Zebra TC52
   * Touch mobile computer — modern warehouse device with touchscreen.
   * 5" display, no physical QWERTY, touch + integrated scanner.
   * Needs soft key overlay for CTRL shortcuts.
   * Confirm exact screen character grid with GEODIS IT.
   */
  ZEBRA_TC52: {
    modelId: "ZEBRA_TC52",
    displayName: "Zebra TC52",
    manufacturer: "Zebra",
    screen: {
      cols: 24,
      rows: 10,
      widthPx: 360,
      heightPx: 640,
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      fontSizePx: 15,
      lineHeightPx: 28,
      bgColor: "#0d0d0d",
      textColor: "#e0e0e0", // lighter text on modern device
      highlightColor: "#ff6b6b",
      cursorColor: "#4fc3f7",
    },
    keyboard: {
      hardwareShortcuts: [], // no physical CTRL keys
      showSoftKeys: true, // needs on-screen buttons
    },
    input: {
      hasIntegratedScanner: true,
      hasTouchscreen: true,
      hasNumericKeypad: false,
      hasQwerty: false,
    },
    layout: {
      aspectRatio: "aspect-[9/16]",
      showBezel: true,
      bezelColor: "#1a1a1a",
      softKeyPosition: "bottom",
    },
  },

  /**
   * Generic Terminal
   * Fallback for unknown or unconfirmed device models.
   * Designed to work acceptably on any device.
   * Used as default until device is confirmed.
   */
  GENERIC_TERMINAL: {
    modelId: "GENERIC_TERMINAL",
    displayName: "Generic Terminal",
    manufacturer: "Generic",
    screen: {
      cols: 20,
      rows: 8,
      widthPx: 375,
      heightPx: 280,
      fontFamily: "'Courier New', monospace",
      fontSizePx: 14,
      lineHeightPx: 26,
      bgColor: "#0a0a0a",
      textColor: "#00ff41",
      highlightColor: "#ff4444",
      cursorColor: "#ffff00",
    },
    keyboard: {
      hardwareShortcuts: ALL_SHORTCUTS,
      showSoftKeys: true, // always show soft keys on unknown device
    },
    input: {
      hasIntegratedScanner: true,
      hasTouchscreen: true,
      hasNumericKeypad: true,
      hasQwerty: true,
    },
    layout: {
      aspectRatio: "aspect-[4/3]",
      showBezel: false,
      bezelColor: "#333333",
      softKeyPosition: "bottom",
    },
  },
};

// ─── Active Device Config ─────────────────────────────────────────────────────

/**
 * The currently active device model for the emulator.
 *
 * TODO: Replace "GENERIC_TERMINAL" with the confirmed model once
 *       GEODIS IT confirms the device deployed at the facility.
 *       Options: "HONEYWELL_CK65" | "ZEBRA_TC52"
 */
export const ACTIVE_DEVICE_MODEL_ID: RFDeviceModelId = "GENERIC_TERMINAL";

export function getDeviceModel(modelId?: RFDeviceModelId): RFDeviceModel {
  const id = modelId ?? ACTIVE_DEVICE_MODEL_ID;
  return RF_DEVICE_MODELS[id] ?? RF_DEVICE_MODELS["GENERIC_TERMINAL"];
}

/**
 * Register a new device model at runtime.
 * Use this for facility-specific custom configurations.
 *
 * Example:
 *   registerDeviceModel({
 *     modelId: "HONEYWELL_CK65_CUSTOM",
 *     displayName: "Honeywell CK65 (Site A config)",
 *     ...
 *   })
 */
export function registerDeviceModel(model: RFDeviceModel): void {
  RF_DEVICE_MODELS[model.modelId] = model;
}
