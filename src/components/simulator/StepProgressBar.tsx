/**
 * StepProgressBar — segmented progress indicator for simulation steps
 *
 * Shows above the RF Device to indicate simulation progress.
 * Segments: completed (amber filled), current (pulsing amber), remaining (surface-2).
 *
 * Per CLAUDE.md §Architecture: components render only.
 */
"use client"

interface StepProgressBarProps {
  /** Total number of steps in the scenario */
  totalSteps: number
  /** 0-based index of the current step */
  currentStep: number
  /** Label shown right-aligned below the bar */
  label?: string
}

/** Segmented horizontal progress bar with amber theme. */
export function StepProgressBar({ totalSteps, currentStep, label }: StepProgressBarProps) {
  if (totalSteps <= 0) return null

  return (
    <div style={{ width: "100%", maxWidth: 360 }}>
      {/* Segmented bar */}
      <div
        style={{
          display: "flex",
          gap: "2px",
          height: "4px",
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          return (
            <div
              key={i}
              className={isCurrent ? "pulse-amber" : ""}
              style={{
                flex: 1,
                backgroundColor: isCompleted
                  ? "var(--color-amber)"
                  : isCurrent
                    ? "var(--color-amber)"
                    : "var(--color-surface-2)",
                transition: "background-color 0.2s",
              }}
            />
          )
        })}
      </div>

      {/* Label */}
      {label && (
        <div
          style={{
            textAlign: "right",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-text-secondary)",
            marginTop: "4px",
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
