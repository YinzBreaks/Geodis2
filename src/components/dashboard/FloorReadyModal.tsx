/**
 * FloorReadyModal.tsx — Floor-ready confirmation modal for supervisors
 *
 * Shows a threshold checklist and notes field.
 * On confirm, calls POST /api/signoff.
 * Floor-ready status cannot be undone once confirmed.
 *
 * Per CLAUDE.md §Content Rules: floor-ready is an automatic suggestion
 * confirmed by supervisor — never automatic.
 */
"use client"

import { useState } from "react"
import { FLOOR_READY_THRESHOLDS } from "@/config/floorReadyConfig"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Props for the FloorReadyModal component. */
export interface FloorReadyModalProps {
  /** Trainee user ID for the signoff */
  traineeId: string
  /** Trainee display name */
  traineeName: string
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Callback after successful signoff */
  onConfirmed: (signoff: FloorReadySignoffResult) => void
}

/** Shape returned from the signoff API. */
export interface FloorReadySignoffResult {
  id: string
  confirmedAt: string
  supervisorId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD CHECKLIST ITEMS
// ─────────────────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  {
    key: "minFinalScore",
    label: `Final score ≥ ${FLOOR_READY_THRESHOLDS.minFinalScore}`,
    description: "Most recent simulation attempt",
  },
  {
    key: "minAccuracyScore",
    label: `Accuracy score ≥ ${FLOOR_READY_THRESHOLDS.minAccuracyScore}`,
    description: "Most recent simulation attempt",
  },
  {
    key: "minExceptionResolutionRate",
    label: `Exception resolution rate ≥ ${Math.round(FLOOR_READY_THRESHOLDS.minExceptionResolutionRate * 100)}%`,
    description: "All-time across all sessions",
  },
  {
    key: "minSimulationsCompleted",
    label: `≥ ${FLOOR_READY_THRESHOLDS.minSimulationsCompleted} simulations passed`,
    description: "Passed, not just attempted",
  },
  {
    key: "requireAllExceptionTypes",
    label: "All 8 exception types encountered",
    description: "Per BBWD-WI-030 §6",
  },
  {
    key: "requireAdvancedPass",
    label: "≥ 1 ADVANCED simulation passed",
    description: "HAZ or multi-error scenario",
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Confirmation modal for supervisor floor-ready signoff. */
export function FloorReadyModal({
  traineeId,
  traineeName,
  isOpen,
  onClose,
  onConfirmed,
}: FloorReadyModalProps) {
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleConfirm() {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/signoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traineeId, notes: notes || undefined }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          (data as Record<string, string>).error ?? `HTTP ${response.status}`
        )
      }

      const data = (await response.json()) as { signoff: FloorReadySignoffResult }
      onConfirmed(data.signoff)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signoff failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="text-zinc-100 font-mono text-lg font-bold">
            Confirm Floor Ready
          </h2>
          <p className="text-zinc-400 font-mono text-sm mt-1">
            Sign off <span className="text-green-400">{traineeName}</span> as
            floor-ready for independent picking.
          </p>
        </div>

        {/* Checklist */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-wider">
            Threshold Checklist
          </p>
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.key} className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <div>
                <p className="text-zinc-300 font-mono text-sm">{item.label}</p>
                <p className="text-zinc-600 font-mono text-xs">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="px-6 pb-4">
          <label className="block text-zinc-500 font-mono text-xs mb-1">
            Notes (optional)
          </label>
          <textarea
            className="
              w-full bg-zinc-800 border border-zinc-700 rounded-lg
              text-zinc-300 font-mono text-sm p-3
              focus:outline-none focus:border-green-600
              resize-none
            "
            rows={3}
            placeholder="Additional observations or comments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-3">
            <p className="text-red-400 font-mono text-xs">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-zinc-800 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="
              px-4 py-2 text-zinc-400 font-mono text-sm
              hover:text-zinc-200 transition-colors
            "
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="
              px-6 py-2 bg-green-700 hover:bg-green-600
              text-green-100 font-mono text-sm font-bold
              rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isSubmitting ? "Confirming..." : "✓ Confirm Floor Ready"}
          </button>
        </div>
      </div>
    </div>
  )
}
