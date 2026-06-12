/**
 * RFDeviceEmulator — RF Device terminal emulator (enhanced, three-panel page)
 *
 * Visual appearance is driven entirely by the active device model:
 *   - modelId prop (when provided) overrides the store selection
 *   - Otherwise reads activeDeviceModelId from the Zustand store
 *   - getDeviceModel() resolves the model to its screen + layout config
 *
 * Never hardcode colors, fonts, or terminal aesthetics here — use device.screen.*
 * and device.layout.* exclusively.
 *
 * Per CLAUDE.md §RF Device Configuration: TC520K is the primary device.
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { WorkflowStep, DifficultyLevel, type RFDeviceScreen, type RFScreenLine } from "@/types/domain"
import { getDeviceModel, type RFDeviceModel, type RFDeviceScreenConfig } from "@/types/devices"
import {
  useSimulation,
  getInputMode,
  selectScreen,
  selectIsComplete,
  getSoftKeyEnabled,
  shouldPulseSoftKey,
  type SoftKeyId,
} from "@/hooks/useSimulation"

// ─────────────────────────────────────────────────────────────────────────────
// SOFT KEY DEFINITIONS
// Per CLAUDE.md §Canonical Domain Vocabulary: 5 buttons + ENTER
// ─────────────────────────────────────────────────────────────────────────────

interface SoftKeyDef {
  label: string
  sublabel: string
  keys: string
}

const CTRL_KEYS: SoftKeyDef[] = [
  { label: "^T", sublabel: "Task", keys: "CTRL+T" },
  { label: "^E", sublabel: "Done", keys: "CTRL+E" },
  { label: "^A", sublabel: "Accept", keys: "CTRL+A" },
  { label: "^W", sublabel: "Back", keys: "CTRL+W" },
  { label: "^K", sublabel: "Skip", keys: "CTRL+K" },
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface RFDeviceEmulatorProps {
  /**
   * Optional device model ID override. When supplied the emulator renders
   * this device rather than the store's activeDeviceModelId.
   */
  modelId?: string
}

export function RFDeviceEmulator({ modelId }: RFDeviceEmulatorProps = {}) {
  // Atomic selectors — subscribe only to the slices this component renders,
  // so unrelated store updates don't trigger a re-render.
  const session = useSimulation((s) => s.session)
  const scenario = useSimulation((s) => s.scenario)
  const result = useSimulation((s) => s.result)
  const softKeyPulseCount = useSimulation((s) => s.softKeyPulseCount)
  const processInput = useSimulation((s) => s.processInput)
  const recordPulse = useSimulation((s) => s.recordPulse)
  const activeDeviceModelId = useSimulation((s) => s.activeDeviceModelId)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const difficulty = scenario?.difficulty ?? DifficultyLevel.BEGINNER

  // Resolve device config — prop overrides store selection
  const device = getDeviceModel(modelId ?? activeDeviceModelId)
  const emulatorWidth = device.emulatorWidthPx ?? 320
  const touchTarget = device.minTouchTargetPx ?? 44

  // Focus input on step change
  useEffect(() => {
    if (!session) return
    const mode = getInputMode(session.currentStep, selectScreen(session).inputType)
    if (mode !== "CONFIRM" && !selectIsComplete(session)) {
      inputRef.current?.focus()
    }
  }, [session?.currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit handler ──────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!session || selectIsComplete(session)) return

    const rfScreen = selectScreen(session)
    const mode = getInputMode(session.currentStep, rfScreen.inputType)

    if (mode === "SCAN") {
      processInput({ type: "SCAN", value: inputValue, source: "keyboard" })
    } else if (mode === "TYPE") {
      processInput({ type: "QUANTITY", value: inputValue, source: "keyboard" })
    } else {
      processInput({ type: "CONFIRM", value: "", source: "keyboard" })
    }
    setInputValue("")
  }, [session, inputValue, processInput])

  // ── Soft key handler ────────────────────────────────────────────────

  const handleSoftKey = useCallback(
    (keys: string) => {
      if (!session || selectIsComplete(session)) return

      processInput({ type: "SOFTKEY", value: keys, source: "click" })
      setInputValue("")
      inputRef.current?.focus()
    },
    [session, processInput]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  if (!session) return null

  const rfScreen = selectScreen(session)
  const inputMode = getInputMode(session.currentStep, rfScreen.inputType)
  const isComplete = selectIsComplete(session)
  const showFeedback = result && !result.success && result.feedback
  const softKeyState = getSoftKeyEnabled(session)
  const pulseKey = shouldPulseSoftKey(rfScreen, difficulty, softKeyPulseCount)

  const { screen: sc, layout: ly } = device
  const isAndroid = device.uiStyle === "android"

  return (
    <div
      className="rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
      style={{
        backgroundColor: ly.bezelColor,
        border: `1px solid ${ly.screenBorderColor}`,
        width: emulatorWidth,
        maxWidth: "100%",
      }}
    >
      {/* Device header */}
      <div
        className="text-[9px] font-mono text-center tracking-widest uppercase"
        style={{ color: isAndroid ? "#94a3b8" : "#4b5563" }}
      >
        {device.displayName} — GEODIS RF
      </div>

      {/* Screen bezel */}
      <div
        className="rounded-lg p-2"
        style={{
          backgroundColor: isAndroid ? "#f1f5f9" : "#000",
          border: `1px solid ${ly.screenBorderColor}`,
        }}
      >
        <EmulatorScreen screen={rfScreen} inputValue={inputValue} sc={sc} />
      </div>

      {/* Feedback strip */}
      <div className="min-h-[28px]">
        {showFeedback && (
          <div
            className="rounded px-2 py-1 text-xs"
            style={{
              backgroundColor: isAndroid ? "#fff1f2" : "#1c0505",
              border: `1px solid ${isAndroid ? "#fca5a5" : "#7f1d1d"}`,
              color: isAndroid ? "#dc2626" : "#fca5a5",
              fontFamily: sc.fontFamily,
            }}
          >
            {result.feedback}
          </div>
        )}
        {result?.success && !showFeedback && (
          <div
            className="text-[10px] font-mono text-center"
            style={{ color: isAndroid ? "#16a34a" : "#15803d" }}
          >
            ✓ OK
          </div>
        )}
      </div>

      {/* Input area */}
      {!isComplete && (
        <>
          {inputMode !== "CONFIRM" ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm px-3 rounded border focus:outline-none transition-colors"
                style={{
                  backgroundColor: sc.bgColor,
                  color: sc.textColor,
                  fontFamily: sc.fontFamily,
                  borderColor: ly.screenBorderColor,
                  minHeight: touchTarget,
                }}
                placeholder={inputMode === "SCAN" ? "Scan barcode…" : "Enter value…"}
                autoFocus
              />
              <button
                onClick={handleSubmit}
                className="text-xs font-mono px-3 rounded border transition-colors"
                style={{
                  backgroundColor: isAndroid ? "#2563eb" : "#14532d",
                  color: isAndroid ? "#ffffff" : "#bbf7d0",
                  borderColor: isAndroid ? "#1d4ed8" : "#166534",
                  fontFamily: sc.fontFamily,
                  minHeight: touchTarget,
                }}
              >
                {inputMode === "SCAN" ? "SCAN" : "ENTER"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full text-sm font-mono py-2 rounded border transition-colors"
              style={{
                backgroundColor: isAndroid ? "#f1f5f9" : "#27272a",
                color: sc.textColor,
                fontFamily: sc.fontFamily,
                borderColor: ly.screenBorderColor,
                minHeight: touchTarget,
              }}
            >
              Continue
            </button>
          )}
        </>
      )}

      {/* Soft key bar */}
      {device.showSoftKeys && (
        <SmartSoftKeyBar
          onKey={handleSoftKey}
          enabledKeys={softKeyState}
          pulseKey={pulseKey}
          onPulse={recordPulse}
          disabled={isComplete}
          device={device}
          minHeight={touchTarget}
        />
      )}

      {/* Step indicator */}
      <div
        className="text-[9px] font-mono text-center truncate"
        style={{ color: isAndroid ? "#94a3b8" : "#3f3f46" }}
      >
        {session.currentStep} · Pick {session.currentPickIndex}/{session.pickQueue.length}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EMULATOR SCREEN — renders RFScreenLine[] with device-appropriate styling
// ─────────────────────────────────────────────────────────────────────────────

function EmulatorScreen({
  screen,
  inputValue,
  sc,
}: {
  screen: RFDeviceScreen
  inputValue: string
  sc: RFDeviceScreenConfig
}) {
  return (
    <div
      className="rounded text-sm leading-6 p-3 min-h-[180px] select-none"
      style={{
        backgroundColor: sc.bgColor,
        color: sc.textColor,
        fontFamily: sc.fontFamily,
      }}
    >
      {screen.lines.map((line, i) => (
        <ScreenLine
          key={i}
          line={line}
          inputValue={line.isCursorField ? inputValue : ""}
          sc={sc}
        />
      ))}
    </div>
  )
}

function ScreenLine({
  line,
  inputValue,
  sc,
}: {
  line: RFScreenLine
  inputValue: string
  sc: RFDeviceScreenConfig
}) {
  if (line.isCursorField) {
    return (
      <div className="flex" style={{ color: sc.textColor }}>
        {line.label && (
          <span className="mr-1" style={{ color: sc.labelColor }}>
            {line.label}
          </span>
        )}
        <span
          className="min-w-[10ch] inline-block border-b"
          style={{ color: sc.cursorColor, borderColor: sc.cursorColor }}
        >
          {inputValue || <span className="opacity-40">_</span>}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        color: line.isHighlighted ? sc.highlightColor : sc.textColor,
        fontWeight: line.isHighlighted ? "bold" : undefined,
      }}
    >
      {line.label && (
        <span style={{ color: sc.labelColor }}>{line.label}&nbsp;</span>
      )}
      {line.value && <span>{line.value}</span>}
      {!line.label && !line.value && <>&nbsp;</>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART SOFT KEY BAR — with enable/disable + pulse animation
// Per CLAUDE.md §RF Device Configuration: 5 buttons, disabled when not valid
// ─────────────────────────────────────────────────────────────────────────────

function SmartSoftKeyBar({
  onKey,
  enabledKeys,
  pulseKey,
  onPulse,
  disabled,
  device,
  minHeight,
}: {
  onKey: (keys: string) => void
  enabledKeys: Record<SoftKeyId, boolean>
  pulseKey: SoftKeyId | null
  onPulse: () => void
  disabled: boolean
  device: RFDeviceModel
  minHeight: number
}) {
  const isAndroid = device.uiStyle === "android"
  const sc = device.screen

  // Record pulse when pulseKey changes to a non-null value
  const prevPulseRef = useRef<SoftKeyId | null>(null)
  useEffect(() => {
    if (pulseKey && pulseKey !== prevPulseRef.current) {
      onPulse()
    }
    prevPulseRef.current = pulseKey
  }, [pulseKey, onPulse])

  return (
    <div className="flex flex-col gap-1">
      {/* CTRL keys row */}
      <div className="grid grid-cols-5 gap-1">
        {CTRL_KEYS.map((key) => {
          const isEnabled = enabledKeys[key.keys as SoftKeyId]
          const isPulsing = pulseKey === key.keys

          const btnBg = isPulsing
            ? isAndroid ? "#3b82f6" : "#16a34a"
            : isEnabled
              ? isAndroid ? "#f1f5f9" : "#3f3f46"
              : isAndroid ? "#f8fafc" : "#18181b"

          const btnBorder = isPulsing
            ? isAndroid ? "#60a5fa" : "#22c55e"
            : isEnabled
              ? isAndroid ? "#cbd5e1" : "#52525b"
              : isAndroid ? "#e2e8f0" : "#27272a"

          const labelColor = isPulsing
            ? "#ffffff"
            : isEnabled
              ? sc.textColor
              : isAndroid ? "#cbd5e1" : "#52525b"

          const sublabelColor = isPulsing
            ? "rgba(255,255,255,0.8)"
            : isEnabled
              ? sc.labelColor
              : isAndroid ? "#e2e8f0" : "#3f3f46"

          return (
            <button
              key={key.keys}
              onClick={() => onKey(key.keys)}
              disabled={disabled || !isEnabled}
              className={`
                text-xs font-mono py-2 px-0 rounded border
                flex flex-col items-center gap-0.5
                transition-all
                ${isPulsing ? "animate-pulse" : ""}
                disabled:cursor-not-allowed
              `}
              style={{
                backgroundColor: btnBg,
                borderColor: btnBorder,
                fontFamily: sc.fontFamily,
                minHeight,
              }}
              title={key.keys}
            >
              <span className="font-bold text-[11px]" style={{ color: labelColor }}>
                {key.label}
              </span>
              <span className="text-[8px] leading-none" style={{ color: sublabelColor }}>
                {key.sublabel}
              </span>
            </button>
          )
        })}
      </div>

      {/* ENTER key row */}
      <button
        onClick={() => onKey("ENTER")}
        disabled={disabled}
        className="w-full text-xs font-mono py-2 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isAndroid ? "#2563eb" : "#3f3f46",
          color: isAndroid ? "#ffffff" : sc.textColor,
          borderColor: isAndroid ? "#1d4ed8" : "#52525b",
          fontFamily: sc.fontFamily,
          minHeight: minHeight * 0.8,
        }}
      >
        ENTER
      </button>
    </div>
  )
}

