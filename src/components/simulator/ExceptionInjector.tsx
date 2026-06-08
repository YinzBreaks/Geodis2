"use client"

/**
 * ExceptionInjector — Trainer control to inject exceptions live (Overhaul 4)
 *
 * Renders the five trainable BBWD-WI-030 §6 exception types as buttons.
 * Clicking one queues the exception via the simulation store so it fires on
 * the trainee's next scan at the current pick. Pure UI — all injection logic
 * lives in the store's injectException action, which only appends to the live
 * scenario's errorScenarios (the pure engine is untouched).
 */

import { useSimulation } from "@/hooks/useSimulation"
import { ScanResult } from "@/types/domain"

interface ExceptionOption {
  label: string
  errorType: ScanResult
  sop: string
  isLastItemAtLocation?: boolean
}

const OPTIONS: ExceptionOption[] = [
  { label: "Tote Already Allocated", errorType: ScanResult.TOTE_ALLOCATED, sop: "§6.1" },
  { label: "Pick Cart Already Created", errorType: ScanResult.CART_ALLOCATED, sop: "§6.2" },
  { label: "Invalid Item", errorType: ScanResult.WRONG_ITEM, sop: "§6.5", isLastItemAtLocation: true },
  { label: "Short Inventory", errorType: ScanResult.ITEM_NOT_FOUND, sop: "§6.6" },
  { label: "Damaged Item", errorType: ScanResult.ITEM_DAMAGED, sop: "§6.7" },
]

export function ExceptionInjector() {
  const session = useSimulation((s) => s.session)
  const injectException = useSimulation((s) => s.injectException)

  const disabled = !session

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
        >
          Inject Exception
        </h3>
        <span
          className="text-[10px]"
          style={{ fontFamily: "var(--font-terminal)", color: "var(--concrete)" }}
        >
          BBWD-WI-030 §6
        </span>
      </div>

      <p
        className="text-[11px]"
        style={{ fontFamily: "var(--font-body)", color: "var(--color-text-secondary)" }}
      >
        Fires on the trainee&apos;s next scan.
      </p>

      <div className="grid grid-cols-1 gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.errorType}
            type="button"
            disabled={disabled}
            onClick={() => injectException(opt.errorType, opt.isLastItemAtLocation)}
            className="flex items-center justify-between px-3 py-2 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-body)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (disabled) return
              e.currentTarget.style.borderColor = "var(--danger-bright)"
              e.currentTarget.style.background = "rgba(231,76,60,0.12)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)"
              e.currentTarget.style.background = "var(--color-surface-2)"
            }}
          >
            <span>{opt.label}</span>
            <span style={{ color: "var(--concrete)", fontFamily: "var(--font-terminal)", fontSize: 10 }}>
              {opt.sop}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
