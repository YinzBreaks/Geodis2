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
  { emoji: string; label: string; bgClass: string; textClass: string }
> = {
  FLOOR_READY: {
    emoji: "🟢",
    label: "Floor Ready",
    bgClass: "bg-green-900/40",
    textClass: "text-green-400",
  },
  IN_PROGRESS: {
    emoji: "🟡",
    label: "In Progress",
    bgClass: "bg-yellow-900/40",
    textClass: "text-yellow-400",
  },
  NEEDS_COACHING: {
    emoji: "🔴",
    label: "Needs Coaching",
    bgClass: "bg-red-900/40",
    textClass: "text-red-400",
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
      className="
        group block min-w-[220px] max-w-[280px]
        bg-zinc-900 border border-zinc-800 rounded-xl p-4
        hover:border-zinc-600 hover:bg-zinc-800/50
        transition-colors cursor-pointer
        flex-shrink-0
      "
    >
      {/* Header: Name + Employee ID */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-zinc-100 font-mono text-sm font-semibold truncate max-w-[160px]">
            {name}
          </p>
          <p className="text-zinc-500 font-mono text-xs">ID: {employeeId}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono ${statusCfg.bgClass} ${statusCfg.textClass} mb-3`}
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
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-zinc-500">Best Score</span>
          <span className="text-zinc-300">{Math.round(bestScore)}</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-zinc-500">Sessions</span>
          <span className="text-zinc-300">
            {sessionsCompleted} completed &middot; {sessionsRequired} required to pass
          </span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-zinc-500">Last Active</span>
          <span className="text-zinc-300">{lastActiveStr}</span>
        </div>
      </div>
    </Link>
  )
}
