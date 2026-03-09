/**
 * TraineeCard.tsx — Trainee summary card for supervisor and pick lead views
 *
 * Displays: name, employee ID, floor-ready status badge, best score,
 * sessions completed/required, last active date.
 *
 * Reusable across supervisor + lead dashboard views.
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import Link from "next/link"
import type { FloorReadyStatus, FloorReadyGap } from "@/lib/floorReadiness"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Props for the TraineeCard component. */
export interface TraineeCardProps {
  /** User ID for navigation link */
  userId: string
  /** Full name of the trainee */
  name: string
  /** Employee ID (badge number) */
  employeeId: string
  /** Current floor-ready assessment status */
  floorReadyStatus: FloorReadyStatus
  /** Best final score across all sessions */
  bestScore: number
  /** Number of completed sessions */
  sessionsCompleted: number
  /** Required number of sessions (from thresholds) */
  sessionsRequired: number
  /** Last session timestamp */
  lastActive: Date | null
  /** Identified floor-ready gaps (shown in tooltip) */
  gaps: FloorReadyGap[]
  /** Link base URL — defaults to supervisor view */
  linkBase?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  FloorReadyStatus,
  { emoji: string; label: string; bg: string; text: string }
> = {
  FLOOR_READY: {
    emoji: "🟢",
    label: "Floor Ready",
    bg: "rgba(46, 160, 67, 0.15)",
    text: "var(--color-success, #2ea043)",
  },
  IN_PROGRESS: {
    emoji: "🟡",
    label: "In Progress",
    bg: "rgba(240, 165, 0, 0.15)",
    text: "var(--color-amber, #f0a500)",
  },
  NEEDS_COACHING: {
    emoji: "🔴",
    label: "Needs Coaching",
    bg: "rgba(248, 81, 73, 0.15)",
    text: "var(--color-danger, #f85149)",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Individual trainee summary card with status badge and gap tooltip. */
export function TraineeCard({
  userId,
  name,
  employeeId,
  floorReadyStatus,
  bestScore,
  sessionsCompleted,
  sessionsRequired,
  lastActive,
  gaps,
  linkBase = "/dashboard/supervisor/trainee",
}: TraineeCardProps) {
  const statusCfg = STATUS_CONFIG[floorReadyStatus]

  const lastActiveStr = lastActive
    ? new Date(lastActive).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never"

  return (
    <Link
      href={`${linkBase}/${userId}`}
      style={{
        display: "block",
        minWidth: 220,
        maxWidth: 280,
        flexShrink: 0,
        backgroundColor: "var(--color-surface-1)",
        border: "1px solid var(--color-border)",
        borderLeft: "3px solid transparent",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        textDecoration: "none",
        transition: "border-color 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderLeftColor = "var(--color-amber)" }}
      onMouseLeave={(e) => { e.currentTarget.style.borderLeftColor = "transparent" }}
    >
      {/* Header: Name + Employee ID */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <p style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
            {name}
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>ID: {employeeId}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 8px",
          borderRadius: 99,
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          backgroundColor: statusCfg.bg,
          color: statusCfg.text,
          marginBottom: 12,
        }}
        title={
          gaps.length > 0
            ? `Gaps:\n${gaps.map((g) => `• ${g.criterion}: ${g.current} (need ${g.required})`).join("\n")}`
            : "All thresholds met"
        }
      >
        <span>{statusCfg.emoji}</span>
        <span>{statusCfg.label}</span>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>Best Score</span>
          <span style={{ color: "var(--color-text-primary)" }}>{Math.round(bestScore)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>Sessions</span>
          <span style={{ color: "var(--color-text-primary)" }}>
            {sessionsCompleted} completed &middot; {sessionsRequired} required to pass
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>Last Active</span>
          <span style={{ color: "var(--color-text-primary)" }}>{lastActiveStr}</span>
        </div>
      </div>
    </Link>
  )
}
