/**
 * WT4000PhotoShell — Photo-realistic Symbol WT4000 wrist terminal emulator
 *
 * Uses scanner.png (transparent PNG, served from /images/scanner.png) as the
 * visual layer. A transparent screen overlay is positioned over the LCD area
 * and renders live RFDeviceDisplay output. Every physical key on the photo
 * becomes a clickable hotspot <button> positioned with CSS percentage coords,
 * so the layout stays responsive as the container scales.
 *
 * CTRL mode: tap ALT/CTRL → ctrlActive; keys with a ctrlKey mapping light up
 *   in blue → tap the key → fires the combo → ctrlActive resets.
 * SHIFT mode: tap SHIFT → shiftActive; alpha keys highlight amber → tap appends
 *   the uppercase letter → shiftActive resets.
 *
 * The feedback strip, text input, and SoftKeyBar (accessibility fallback) render
 * below the photo, outside the relative container.
 *
 * ── Calibration ───────────────────────────────────────────────────────────────
 * Set DEBUG_OVERLAY = true to show coloured outlines on every hotspot for
 * alignment tuning. Set back to false before committing.
 */
"use client"

import { useState, useCallback } from "react"
import { RFDeviceDisplay } from "./RFDeviceDisplay"
import { SoftKeyBar } from "./SoftKeyBar"
import { CoachingTooltip } from "./CoachingTooltip"
import type { RFDeviceModel } from "@/types/devices"
import { getExpectedKey, getExpectedInputType } from "@/lib/stepKeyMap"
import type { EngineResult, SimulationSession } from "@/types/domain"
import type { CoachingState } from "@/types/coaching"
import { selectScreen } from "@/hooks/useSimulation"

// ─── DEBUG: set true to render hotspot outlines for calibration ───────────────
const DEBUG_OVERLAY = true

// ─── Screen overlay calibration constants ────────────────────────────────────
// Measured from scanner.png at 1270×999px.
// left/top = distance from image top-left corner to LCD top-left corner.
// width/height = LCD area size. Tweak until text fills the screen exactly.
const SCREEN = {
  left:   "20.5%",
  top:    "17.0%",
  width:  "34.5%",
  height: "41.0%",
}

// ─── Key hotspot type ─────────────────────────────────────────────────────────

type KeyAction =
  | "CTRL_TOGGLE"
  | "SHIFT_TOGGLE"
  | "ENTER"
  | "BACKSPACE"
  | "TAB"
  | "SCAN_TRIGGER"
  | "P1"
  | "P2"

interface KeyHotspot {
  /** Unique stable id */
  id: string
  /** Human label — used for aria-label and debug overlay */
  label: string
  /** Center x as % of image width */
  cx: string
  /** Center y as % of image height */
  cy: string
  /** Button width as % of image width */
  w: string
  /** Button height as % of image height */
  h: string
  /** Character appended to inputValue on click (normal mode) */
  primary?: string
  /** Character appended to inputValue when shiftActive */
  shiftChar?: string
  /** CTRL combo fired when ctrlActive — e.g. "CTRL+T" */
  ctrlKey?: string
  /** Named action (takes priority over primary/shiftChar) */
  action?: KeyAction
}

// ─── Full keyboard hotspot map ────────────────────────────────────────────────
// Positions calibrated from scanner.png (1270px wide × 999px tall approx).
// cx/cy are center-points; w/h are button dimensions. All as image-percentage.
const KEY_MAP: KeyHotspot[] = [
  // ── Left modifier column ────────────────────────────────────────────────────
  { id: "ESC",      label: "ESC",      cx: "15.0%", cy: "22.5%", w: "7.0%", h: "5.0%", ctrlKey: "CTRL+W" },
  { id: "BACK_FWD", label: "← →",      cx: "15.0%", cy: "28.5%", w: "7.0%", h: "4.5%" },
  { id: "MENU_TAB", label: "MENU/TAB", cx: "15.0%", cy: "34.5%", w: "7.0%", h: "5.0%", action: "TAB" },
  { id: "ALT_CTRL", label: "ALT/CTRL", cx: "15.0%", cy: "40.5%", w: "7.0%", h: "5.5%", action: "CTRL_TOGGLE" },
  { id: "SHIFT",    label: "SHIFT",    cx: "15.0%", cy: "47.5%", w: "7.0%", h: "5.5%", action: "SHIFT_TOGGLE" },
  { id: "BLUE_SCAN",label: "SCAN",     cx: "13.0%", cy: "55.5%", w: "8.0%", h: "7.0%", action: "SCAN_TRIGGER" },

  // ── Keyboard row 1: 1/AB — 2/CD — 3/EF ────────────────────────────────────
  { id: "K1", label: "1/AB", cx: "66.5%", cy: "22.0%", w: "6.0%", h: "6.5%", primary: "1", shiftChar: "A", ctrlKey: "CTRL+A" },
  { id: "K2", label: "2/CD", cx: "76.0%", cy: "22.0%", w: "6.0%", h: "6.5%", primary: "2", shiftChar: "C" },
  { id: "K3", label: "3/EF", cx: "85.5%", cy: "22.0%", w: "6.0%", h: "6.5%", primary: "3", shiftChar: "E", ctrlKey: "CTRL+E" },

  // ── Keyboard row 2: 4/GH — 5/IJ — 6/KL ────────────────────────────────────
  { id: "K4", label: "4/GH", cx: "66.5%", cy: "30.5%", w: "6.0%", h: "6.5%", primary: "4", shiftChar: "G" },
  { id: "K5", label: "5/IJ", cx: "76.0%", cy: "30.5%", w: "6.0%", h: "6.5%", primary: "5", shiftChar: "I" },
  { id: "K6", label: "6/KL", cx: "85.5%", cy: "30.5%", w: "6.0%", h: "6.5%", primary: "6", shiftChar: "K", ctrlKey: "CTRL+K" },

  // ── Keyboard row 3: 7/MN — 8/OP — 9/QR ────────────────────────────────────
  { id: "K7", label: "7/MN", cx: "66.5%", cy: "39.0%", w: "6.0%", h: "6.5%", primary: "7", shiftChar: "M" },
  { id: "K8", label: "8/OP", cx: "76.0%", cy: "39.0%", w: "6.0%", h: "6.5%", primary: "8", shiftChar: "O" },
  { id: "K9", label: "9/QR", cx: "85.5%", cy: "39.0%", w: "6.0%", h: "6.5%", primary: "9", shiftChar: "Q" },

  // ── Keyboard row 4: S/T — U/V — W/X ────────────────────────────────────────
  { id: "KST", label: "S/T", cx: "66.5%", cy: "45.5%", w: "6.0%", h: "6.0%", primary: "S", shiftChar: "T", ctrlKey: "CTRL+T" },
  { id: "KUV", label: "U/V", cx: "76.0%", cy: "45.5%", w: "6.0%", h: "6.0%", primary: "U", shiftChar: "V" },
  { id: "KWX", label: "W/X", cx: "85.5%", cy: "45.5%", w: "6.0%", h: "6.0%", primary: "W", shiftChar: "X", ctrlKey: "CTRL+W" },

  // ── Keyboard row 5: BK5P — 0 — arrows ──────────────────────────────────────
  { id: "KBSP", label: "BK5P", cx: "66.5%", cy: "51.5%", w: "6.0%", h: "6.0%", action: "BACKSPACE" },
  { id: "K0",   label: "0",    cx: "76.0%", cy: "51.5%", w: "6.0%", h: "6.0%", primary: "0" },
  { id: "KARR", label: "< ^",  cx: "85.5%", cy: "51.5%", w: "6.0%", h: "6.0%" },

  // ── Large thumb buttons + Y/Z ────────────────────────────────────────────────
  { id: "THUMB_L", label: "Thumb L", cx: "67.5%", cy: "57.5%", w: "8.0%", h: "7.0%" },
  { id: "THUMB_R", label: "Thumb R", cx: "77.0%", cy: "57.5%", w: "8.0%", h: "7.0%" },
  { id: "KYZ",    label: "Y/Z",     cx: "88.5%", cy: "55.5%", w: "6.0%", h: "6.0%", primary: "Y", shiftChar: "Z" },

  // ── Bottom row: P1 — P2 — ENTER ─────────────────────────────────────────────
  { id: "P1",    label: "P1",    cx: "38.0%", cy: "64.0%", w: "9.5%",  h: "5.5%", action: "P1" },
  { id: "P2",    label: "P2",    cx: "48.5%", cy: "64.0%", w: "9.5%",  h: "5.5%", action: "P2" },
  { id: "ENTER", label: "ENTER", cx: "61.0%", cy: "64.0%", w: "14.0%", h: "5.5%", action: "ENTER" },
]

// Keys that have a CTRL combo mapped — lit blue in ctrlActive mode
const CTRL_KEY_IDS = new Set(KEY_MAP.filter((k) => k.ctrlKey).map((k) => k.id))
// Keys that have a shift char — lit amber in shiftActive mode
const SHIFT_KEY_IDS = new Set(KEY_MAP.filter((k) => k.shiftChar).map((k) => k.id))

// ─── Props (matches WT4000Shell interface in RFDevice.tsx) ────────────────────

interface WT4000PhotoShellProps {
  device: RFDeviceModel
  animClass: string
  lastActionResult: string | null
  rfScreen: ReturnType<typeof selectScreen>
  inputValue: string
  inputMode: string
  isComplete: boolean
  showFeedback: string | false | null | undefined
  result: EngineResult | null
  inputError: string | null
  session: SimulationSession
  coaching: CoachingState
  softKeyEnabled: Record<string, boolean>
  inputRef: React.RefObject<HTMLInputElement>
  handleSubmit: () => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleSoftKey: (keys: string) => void
  setInputValue: (v: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WT4000PhotoShell({
  device,
  animClass,
  lastActionResult,
  rfScreen,
  inputValue,
  inputMode,
  isComplete,
  showFeedback,
  result,
  inputError,
  session,
  coaching,
  softKeyEnabled,
  inputRef,
  handleSubmit,
  handleKeyDown,
  handleSoftKey,
  setInputValue,
}: WT4000PhotoShellProps) {
  const { screen: sc, layout: ly } = device
  const touchTarget = device.minTouchTargetPx ?? 44

  // Modifier key mode state
  const [ctrlActive, setCtrlActive] = useState(false)
  const [shiftActive, setShiftActive] = useState(false)

  /** Dispatch the appropriate action for a hotspot click. */
  const handleHotspotClick = useCallback(
    (key: KeyHotspot) => {
      if (isComplete) return

      // ── Named actions ────────────────────────────────────────────────────────
      if (key.action === "CTRL_TOGGLE") {
        setCtrlActive((prev) => !prev)
        return
      }
      if (key.action === "SHIFT_TOGGLE") {
        setShiftActive((prev) => !prev)
        return
      }
      if (key.action === "ENTER") {
        handleSubmit()
        return
      }
      if (key.action === "BACKSPACE") {
        setInputValue(inputValue.slice(0, -1))
        return
      }
      if (key.action === "TAB") {
        setInputValue(inputValue + "\t")
        return
      }
      if (key.action === "SCAN_TRIGGER") {
        const el = document.getElementById("warehouse-floor")
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" })
          el.classList.add("floor-flash")
          setTimeout(() => el.classList.remove("floor-flash"), 900)
        }
        return
      }
      // P1/P2 — no action assigned yet
      if (key.action === "P1" || key.action === "P2") return

      // ── ESC (no action field) — fires CTRL+W ─────────────────────────────────
      if (key.id === "ESC" && key.ctrlKey) {
        handleSoftKey(key.ctrlKey)
        return
      }

      // ── CTRL mode ────────────────────────────────────────────────────────────
      if (ctrlActive && key.ctrlKey) {
        const isEnabled = softKeyEnabled[key.ctrlKey] ?? false
        if (isEnabled) {
          handleSoftKey(key.ctrlKey)
        }
        setCtrlActive(false)
        return
      }

      // ── SHIFT mode ───────────────────────────────────────────────────────────
      if (shiftActive && key.shiftChar) {
        setInputValue(inputValue + key.shiftChar)
        setShiftActive(false)
        return
      }

      // ── Normal character key ─────────────────────────────────────────────────
      if (key.primary) {
        setInputValue(inputValue + key.primary)
      }
    },
    [
      isComplete,
      ctrlActive,
      shiftActive,
      inputValue,
      softKeyEnabled,
      handleSubmit,
      handleSoftKey,
      setInputValue,
    ]
  )

  return (
    <div className={`flex flex-col gap-2 ${animClass}`} style={{ maxWidth: 640, width: "100%" }}>

      {/* ── Photo layer + all overlays ──────────────────────────────────────── */}
      <div style={{ position: "relative", display: "block", userSelect: "none" }}>

        {/* Device photo — transparent PNG renders as cutout on dark bg */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/scanner.png"
          alt="Symbol WT4000 RF terminal"
          draggable={false}
          style={{ display: "block", width: "100%", height: "auto", pointerEvents: "none" }}
        />

        {/* ── Screen overlay — positioned over the LCD area in the photo ─────── */}
        <div
          style={{
            position:        "absolute",
            left:            SCREEN.left,
            top:             SCREEN.top,
            width:           SCREEN.width,
            height:          SCREEN.height,
            overflow:        "hidden",
            backgroundColor: "#000000",
            // Lime outline in debug mode so you can see the boundary
            outline:         DEBUG_OVERLAY ? "2px solid lime" : undefined,
          }}
        >
          {/* Scale font so 20 chars fill the overlay width.
              The overlay is ~34.5% of max 640px = ~220px wide.
              20 chars × (char_width) = 220px → char_width ≈ 11px at ratio 0.6 → fontSize ≈ 10px.
              We use a CSS var driven by container query instead so it
              scales automatically as the photo scales. */}
          <div style={{ width: "100%", height: "100%", fontSize: "clamp(6px, 1.55vw, 10px)" }}>
            <RFDeviceDisplay
              screen={rfScreen}
              inputValue={inputValue}
              screenConfig={{
                ...sc,
                // Override font size so text scales with the overlay
                fontSize: "1em",
                lineHeight: "1.35",
              }}
              highlightLine={coaching.content?.highlightLine}
              renderMode="terminal"
              stepName={session.currentStep.replace(/_/g, " ")}
            />
          </div>
          <CoachingTooltip
            highlightLine={coaching.content?.highlightLine}
            screenLineCount={rfScreen.lines.length}
            isVisible={coaching.isVisible}
          />
        </div>

        {/* ── Scan beam overlay (fires on correct action) ─────────────────────── */}
        {lastActionResult === "correct" && (
          <div
            className="scan-beam"
            style={{
              position: "absolute",
              left: SCREEN.left,
              top:  SCREEN.top,
              width: SCREEN.width,
            }}
          />
        )}

        {/* ── Key hotspots ─────────────────────────────────────────────────────── */}
        {KEY_MAP.map((key) => {
          const isCtrlCapable   = CTRL_KEY_IDS.has(key.id)
          const isShiftCapable  = SHIFT_KEY_IDS.has(key.id)
          const isCtrlEnabled   = ctrlActive && isCtrlCapable && (softKeyEnabled[key.ctrlKey!] ?? false)
          const isCtrlDisabled  = ctrlActive && isCtrlCapable && !(softKeyEnabled[key.ctrlKey!] ?? false)
          const isShiftHighlit  = shiftActive && isShiftCapable

          // Modifier state active but this key is irrelevant — fade it out slightly
          const fadeOut =
            (ctrlActive && !isCtrlCapable && key.action !== "CTRL_TOGGLE") ||
            (shiftActive && !isShiftCapable && key.action !== "SHIFT_TOGGLE")

          // Background highlight logic
          let bg = "transparent"
          let border = "none"
          let color = "transparent"
          if (DEBUG_OVERLAY) {
            bg = "rgba(255,0,0,0.15)"
            border = "1px solid red"
            color = "white"
          } else if (key.action === "CTRL_TOGGLE" && ctrlActive) {
            bg = "rgba(79,195,247,0.30)"
            border = "1px solid rgba(79,195,247,0.8)"
          } else if (key.action === "SHIFT_TOGGLE" && shiftActive) {
            bg = "rgba(251,191,36,0.30)"
            border = "1px solid rgba(251,191,36,0.8)"
          } else if (isCtrlEnabled) {
            bg = "rgba(79,195,247,0.25)"
            border = "1px solid rgba(79,195,247,0.7)"
          } else if (isShiftHighlit) {
            bg = "rgba(251,191,36,0.20)"
            border = "1px solid rgba(251,191,36,0.6)"
          }

          const hasAnyAction =
            key.action !== undefined || key.primary !== undefined || key.ctrlKey !== undefined

          return (
            <button
              key={key.id}
              aria-label={key.label}
              disabled={isComplete || isCtrlDisabled}
              onClick={() => handleHotspotClick(key)}
              style={{
                position:     "absolute",
                left:         `calc(${key.cx} - ${key.w} / 2)`,
                top:          `calc(${key.cy} - ${key.h} / 2)`,
                width:        key.w,
                height:       key.h,
                background:   bg,
                border,
                color,
                borderRadius: "4px",
                cursor:       isComplete || !hasAnyAction ? "default" : "pointer",
                opacity:      fadeOut || isCtrlDisabled ? 0.35 : 1,
                fontSize:     "6px",
                fontFamily:   "monospace",
                padding:      0,
                overflow:     "hidden",
                transition:   "background 0.1s, border-color 0.1s",
              }}
              // Hover styles applied via CSS class below
              className="wt4000-hotspot"
              title={
                ctrlActive && key.ctrlKey
                  ? key.ctrlKey
                  : shiftActive && key.shiftChar
                    ? key.shiftChar
                    : key.label
              }
            >
              {/* CTRL mode overlay label */}
              {ctrlActive && key.ctrlKey && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px",
                    fontWeight: 700,
                    color: isCtrlEnabled ? "#4FC3F7" : "#666",
                    pointerEvents: "none",
                  }}
                >
                  ^{key.ctrlKey.replace("CTRL+", "")}
                </span>
              )}
              {/* SHIFT mode overlay label */}
              {shiftActive && key.shiftChar && !ctrlActive && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#FBBF24",
                    pointerEvents: "none",
                  }}
                >
                  {key.shiftChar}
                </span>
              )}
              {/* Debug label */}
              {DEBUG_OVERLAY && key.label}
            </button>
          )
        })}

        {/* ── CTRL mode active indicator strip ────────────────────────────────── */}
        {ctrlActive && (
          <div
            style={{
              position:    "absolute",
              left:        SCREEN.left,
              top:         "8%",
              width:       SCREEN.width,
              background:  "rgba(79,195,247,0.18)",
              border:      "1px solid rgba(79,195,247,0.5)",
              borderRadius: 3,
              padding:     "2px 6px",
              fontSize:    10,
              fontFamily:  "'Courier New', monospace",
              color:       "#4FC3F7",
              textAlign:   "center",
              pointerEvents: "none",
            }}
          >
            CTRL MODE — tap T · E · A · W · K
          </div>
        )}

        {/* ── SHIFT mode active indicator strip ───────────────────────────────── */}
        {shiftActive && (
          <div
            style={{
              position:    "absolute",
              left:        SCREEN.left,
              top:         "8%",
              width:       SCREEN.width,
              background:  "rgba(251,191,36,0.18)",
              border:      "1px solid rgba(251,191,36,0.5)",
              borderRadius: 3,
              padding:     "2px 6px",
              fontSize:    10,
              fontFamily:  "'Courier New', monospace",
              color:       "#FBBF24",
              textAlign:   "center",
              pointerEvents: "none",
            }}
          >
            SHIFT MODE — tap letter key
          </div>
        )}
      </div>

      {/* ── Feedback strip (engine errors + inline input errors) ─────────────── */}
      <div className="min-h-[24px]">
        {inputError && !showFeedback && (
          <div
            className="rounded px-2 py-1 text-xs font-mono"
            style={{
              backgroundColor: "#1c1000",
              border:          "1px solid #78350f",
              color:           "#fcd34d",
              fontFamily:      sc.fontFamily,
            }}
          >
            {inputError}
          </div>
        )}
        {showFeedback && (
          <div
            className="rounded px-2 py-1 text-xs font-mono"
            style={{
              backgroundColor: "#1c0505",
              border:          "1px solid #7f1d1d",
              color:           "#fca5a5",
              fontFamily:      sc.fontFamily,
            }}
          >
            {result?.feedback}
          </div>
        )}
        {result?.success && !showFeedback && !inputError && (
          <div
            className="text-[10px] font-mono text-center"
            style={{ color: "#15803d" }}
          >
            ✓ OK
          </div>
        )}
      </div>

      {/* ── Input area ───────────────────────────────────────────────────────── */}
      {!isComplete && (() => {
        const expectedInput = getExpectedInputType(session.currentStep)

        if (expectedInput === "scan") {
          return (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("warehouse-floor")
                if (!el) return
                el.scrollIntoView({ behavior: "smooth", block: "nearest" })
                el.classList.add("floor-flash")
                setTimeout(() => el.classList.remove("floor-flash"), 900)
              }}
              className="text-[10px] font-mono text-center py-2 rounded w-full transition-opacity hover:opacity-80 active:opacity-60"
              style={{
                backgroundColor: "#18181b",
                color:           "#fcd34d",
                border:          "1px dashed #713f12",
                minHeight:       touchTarget,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                cursor:          "pointer",
              }}
            >
              ↙ Scan on Warehouse Floor  (or tap blue button on device)
            </button>
          )
        }

        if (expectedInput === "keypress") {
          return null
        }

        return inputMode !== "CONFIRM" ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm px-3 rounded border focus:outline-none"
              style={{
                backgroundColor: sc.bgColor,
                color:           sc.textColor,
                fontFamily:      sc.fontFamily,
                borderColor:     ly.screenBorderColor,
                minHeight:       touchTarget,
              }}
              placeholder={inputMode === "SCAN" ? "Scan barcode…  (or tap keys on device)" : "Enter value…"}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              className="text-xs font-mono px-3 rounded border"
              style={{
                backgroundColor: "#14532d",
                color:           "#bbf7d0",
                borderColor:     "#166534",
                fontFamily:      sc.fontFamily,
                minHeight:       touchTarget,
              }}
            >
              {inputMode === "SCAN" ? "SCAN" : "ENTER"}
            </button>
          </div>
        ) : (
          !getExpectedKey(session.currentStep) && (
            <button
              onClick={handleSubmit}
              className="w-full text-sm font-mono py-2 rounded border"
              style={{
                backgroundColor: "#27272a",
                color:           sc.textColor,
                borderColor:     ly.screenBorderColor,
                fontFamily:      sc.fontFamily,
                minHeight:       touchTarget,
              }}
            >
              Continue
            </button>
          )
        )
      })()}

      {/* ── SoftKeyBar — accessibility fallback for CTRL combos ─────────────── */}
      <SoftKeyBar
        onKey={handleSoftKey}
        disabled={isComplete}
        uiStyle="terminal"
        highlightKey={getExpectedKey(session.currentStep) ?? undefined}
        enabledKeys={softKeyEnabled}
      />

      {/* ── Step indicator ───────────────────────────────────────────────────── */}
      <div
        className="text-[9px] font-mono text-center truncate"
        style={{ color: "#3f3f46" }}
      >
        {session.currentStep}
      </div>
    </div>
  )
}
