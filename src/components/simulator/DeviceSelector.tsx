/**
 * DeviceSelector — runtime device model picker
 *
 * Renders a compact dropdown that lets trainers change the active RF Device
 * without editing code. Reads/writes activeDeviceModelId in the Zustand store.
 *
 * Switching devices triggers RFDevice / RFDeviceEmulator to re-render with
 * the new model's screen + layout config immediately.
 *
 * Per CLAUDE.md §RF Device Configuration:
 *   Adding a new device requires only an entry in RF_DEVICE_MODELS — this
 *   selector automatically picks it up from the registry.
 */
"use client"

import { RF_DEVICE_MODELS } from "@/types/devices"
import { useSimulation } from "@/hooks/useSimulation"

export function DeviceSelector() {
  const { activeDeviceModelId, setActiveDevice } = useSimulation()

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          color: "var(--color-text-secondary)",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          whiteSpace: "nowrap",
        }}
      >
        Device:
      </span>
      <select
        value={activeDeviceModelId}
        onChange={(e) => setActiveDevice(e.target.value)}
        style={{
          backgroundColor: "var(--color-surface-1)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          padding: "4px 8px",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          outline: "none",
        }}
        aria-label="Select RF Device model"
      >
        {Object.values(RF_DEVICE_MODELS).map((model) => {
          const isRealDevice = model.modelId === "SYMBOL_WT4000"
          const isModern = model.uiStyle === "modern"
          const label = isRealDevice
            ? `${model.displayName} ← Real Device`
            : isModern
              ? `${model.displayName}  ✦ Default`
              : `${model.displayName} — Classic`
          return (
            <option key={model.modelId} value={model.modelId}>
              {label}
            </option>
          )
        })}
      </select>
    </div>
  )
}
