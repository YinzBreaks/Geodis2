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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div
        style={{
          backgroundColor: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: 512,
          margin: "0 16px",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--color-border)", padding: "16px 24px" }}>
          <h2 style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>
            Confirm Floor Ready
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)", fontSize: 13, marginTop: 4 }}>
            Sign off <span style={{ color: "var(--color-amber)", fontWeight: 600 }}>{traineeName}</span> as
            floor-ready for independent picking.
          </p>
        </div>

        {/* Checklist */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Threshold Checklist
          </p>
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ color: "var(--color-success)", marginTop: 2 }}>✓</span>
              <div>
                <p style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{item.label}</p>
                <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)", fontSize: 11 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div style={{ padding: "0 24px 16px" }}>
          <label style={{ display: "block", color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)", fontSize: 11, marginBottom: 4 }}>
            Notes (optional)
          </label>
          <textarea
            style={{
              width: "100%",
              backgroundColor: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              padding: 12,
              resize: "none",
              outline: "none",
            }}
            rows={3}
            placeholder="Additional observations or comments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "0 24px 12px" }}>
            <p style={{ color: "var(--color-danger)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{error}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ borderTop: "1px solid var(--color-border)", padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: "8px 16px",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              padding: "8px 24px",
              backgroundColor: isSubmitting ? "var(--color-surface-2)" : "var(--color-amber)",
              color: isSubmitting ? "var(--color-text-secondary)" : "var(--color-base)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: "var(--radius-md)",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Confirming..." : "✓ Confirm Floor Ready"}
          </button>
        </div>
      </div>
    </div>
  )
}
