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
    <div className="flex items-center gap-2">
      <span className="text-zinc-600 text-[10px] font-mono whitespace-nowrap">
        Device:
      </span>
      <select
        value={activeDeviceModelId}
        onChange={(e) => setActiveDevice(e.target.value)}
        className="
          bg-zinc-900 text-zinc-300 border border-zinc-700 rounded
          px-2 py-1 text-[11px] font-mono
          focus:outline-none focus:border-zinc-500
          cursor-pointer hover:border-zinc-600
          transition-colors
        "
        aria-label="Select RF Device model"
      >
        {Object.values(RF_DEVICE_MODELS).map((model) => (
          <option key={model.modelId} value={model.modelId}>
            {model.displayName}
          </option>
        ))}
      </select>
    </div>
  )
}
