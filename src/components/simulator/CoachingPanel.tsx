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

  return (
    <div
      className="coaching-panel"
      style={{
        width: 280,
        minWidth: 280,
        fontFamily: "'Courier New', 'Lucida Console', monospace",
        backgroundColor: "#0f1a0f",
        border: "1px solid #1a4d1a",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflow: "hidden",
        // Fade in when visible
        animation: "coaching-fade-in 0.25s ease-out",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#0d2d0d",
          borderBottom: "1px solid #1a4d1a",
          padding: "6px 12px",
        }}
      >
        <span
          style={{
            color: "#00ff41",
            fontSize: 10,
            fontWeight: "bold",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          ▸ Step Guide
        </span>
      </div>

      {/* DO THIS NOW section */}
      <div
        style={{
          padding: "12px 12px 10px",
          borderBottom: "1px solid #132013",
        }}
      >
        <div
          style={{
            color: "#6aff6a",
            fontSize: 9,
            fontWeight: "bold",
            letterSpacing: "0.1em",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          ▶ DO THIS NOW
        </div>
        <div
          style={{
            color: "#e8ffe8",
            fontSize: 13,
            lineHeight: 1.45,
            fontWeight: "bold",
          }}
        >
          {content.action}
        </div>
      </div>

      {/* WHY THIS STEP section */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: content.fieldDef ? "1px solid #132013" : undefined,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              color: "#4a8a4a",
              fontSize: 9,
              fontWeight: "bold",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            📖 WHY THIS STEP
          </span>
          {badge && (
            <span
              style={{
                backgroundColor: "#0d2d0d",
                border: "1px solid #1a4d1a",
                color: "#00ff41",
                fontSize: 9,
                padding: "1px 5px",
                letterSpacing: "0.05em",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div
          style={{
            color: "#a0c8a0",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {rest}
        </div>
      </div>

      {/* FIELD MEANING section — only when fieldDef is set */}
      {content.fieldDef && (
        <div
          style={{
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              color: "#4a8a4a",
              fontSize: 9,
              fontWeight: "bold",
              letterSpacing: "0.1em",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            💡 FIELD MEANING
          </div>
          <div
            style={{
              color: "#7ab87a",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {content.fieldDef}
          </div>
        </div>
      )}
    </div>
  )
}
