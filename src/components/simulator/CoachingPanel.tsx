/**
 * CoachingPanel — Step-by-step guidance panel for BEGINNER mode
 *
 * Displays beside the RF Device emulator, showing:
 *   - What to do right now (action)
 *   - Why this step exists (sopContext + SOP badge)
 *   - What the active field means (fieldDef — optional)
 *
 * Renders null for INTERMEDIATE/ADVANCED or when coaching is not visible.
 *
 * Per CLAUDE.md §Content Rules §Labs: explain the "why" behind each step.
 * Per requirement spec §STEP 4 — CoachingPanel component.
 *
 * Redesigned to use Industrial Dashboard tokens (amber accent, surface cards).
 */
"use client"

import { DifficultyLevel } from "@/types/domain"
import type { CoachingState } from "@/types/coaching"

// ─────────────────────────────────────────────────────────────────────────────
// SOP BADGE HELPER
// Extracts "§5.1.8" from "§5.1.8 — Pressing CTRL+T…"
// ─────────────────────────────────────────────────────────────────────────────

function extractSopRef(sopContext: string): { badge: string; rest: string } {
  const match = sopContext.match(/^(§[\d.]+)(?:\s+—\s+)?([\s\S]*)$/)
  if (match) return { badge: match[1], rest: match[2] }
  return { badge: "", rest: sopContext }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface CoachingPanelProps {
  coaching: CoachingState
  difficulty: DifficultyLevel
}

/**
 * Step-by-step coaching panel shown to the left of the RF Device
 * when session.difficulty === BEGINNER and coaching.isVisible === true.
 */
export function CoachingPanel({ coaching, difficulty }: CoachingPanelProps) {
  // Guard: only show in BEGINNER mode with active content
  if (difficulty !== DifficultyLevel.BEGINNER) return null
  if (!coaching.isVisible || !coaching.content) return null

  const { content } = coaching
  const { badge, rest } = extractSopRef(content.sopContext)
  const isException = coaching.step != null && String(coaching.step).startsWith("EX_")

  return (
    <div
      className="coaching-panel fade-in-up"
      style={{
        width: 300,
        minWidth: 300,
        fontFamily: "var(--font-ui)",
        backgroundColor: "var(--color-surface-1)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: isException
            ? "rgba(240, 165, 0, 0.15)"
            : "var(--color-surface-2)",
          borderBottom: "1px solid var(--color-border)",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {isException && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-amber)",
              color: "var(--color-base)",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            ⚡
          </span>
        )}
        <span
          style={{
            color: isException
              ? "var(--color-amber)"
              : "var(--color-text-secondary)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
          }}
        >
          {isException ? "⚡ EXCEPTION SCENARIO" : "Step Guide"}
        </span>
      </div>

      {/* DO THIS NOW section */}
      <div
        style={{
          padding: "14px 14px 12px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: "var(--color-amber)",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ▸
          </span>
          <span
            style={{
              color: "var(--color-amber)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
            }}
          >
            DO THIS NOW
          </span>
        </div>
        <div
          style={{
            color: "var(--color-text-primary)",
            fontSize: 14,
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {content.action}
        </div>
      </div>

      {/* WHY THIS STEP section */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: content.fieldDef ? "1px solid var(--color-border)" : undefined,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
            }}
          >
            Why This Step
          </span>
          {badge && (
            <span
              style={{
                backgroundColor: "rgba(240, 165, 0, 0.12)",
                border: "1px solid rgba(240, 165, 0, 0.3)",
                color: "var(--color-amber)",
                fontSize: 9,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
                letterSpacing: "0.04em",
                fontFamily: "var(--font-mono)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {rest}
        </div>
      </div>

      {/* FIELD MEANING section — only when fieldDef is set */}
      {content.fieldDef && (
        <div
          style={{
            padding: "12px 14px",
            backgroundColor: "var(--color-surface-2)",
          }}
        >
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              marginBottom: 6,
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
            }}
          >
            Field Meaning
          </div>
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 12,
              lineHeight: 1.6,
              fontFamily: "var(--font-mono)",
            }}
          >
            {content.fieldDef}
          </div>
        </div>
      )}
    </div>
  )
}
