"use client"

/**
 * GameStatsBar — Live gamification HUD (Overhaul 3C)
 *
 * A non-intrusive stats strip showing score, streak (with flame), accuracy,
 * and pace. Reads derived stats from computeGameStats — no engine coupling.
 * The streak badge animates (streak-flame) when a streak is active, and the
 * whole bar shows a subtle highlight while the 1.5× multiplier window is open.
 */

import { useEffect, useRef, useState } from "react"
import type { SimulationSession } from "@/types/domain"
import { computeGameStats } from "@/lib/gamification"
import { sounds } from "@/lib/audio"

export interface GameStatsBarProps {
  session: SimulationSession
}

export function GameStatsBar({ session }: GameStatsBarProps) {
  const stats = computeGameStats(session)
  const prevStreak = useRef(0)
  const [pop, setPop] = useState(false)

  // Celebrate milestone streaks (5, 10, …) with the success chord.
  useEffect(() => {
    if (
      stats.streak > prevStreak.current &&
      stats.streak > 0 &&
      stats.streak % 5 === 0
    ) {
      sounds.toteComplete()
      setPop(true)
      const t = setTimeout(() => setPop(false), 600)
      prevStreak.current = stats.streak
      return () => clearTimeout(t)
    }
    prevStreak.current = stats.streak
  }, [stats.streak])

  const accuracyPct = Math.round(stats.accuracy * 100)

  return (
    <div
      className="flex items-center gap-4 px-4 py-2 rounded-lg"
      style={{
        fontFamily: "var(--font-display)",
        background: stats.multiplierActive
          ? "linear-gradient(90deg, var(--color-surface-2), rgba(245,166,35,0.18))"
          : "var(--color-surface-2)",
        border: `1px solid ${stats.multiplierActive ? "var(--amber-bright)" : "var(--color-border)"}`,
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}
    >
      <Stat label="SCORE" value={stats.score.toLocaleString()} color="var(--ice-blue)" />

      <Divider />

      {/* Streak with flame */}
      <div className="flex items-center gap-1.5" title="Consecutive correct scans">
        <span
          className={stats.streak > 0 ? "streak-flame" : ""}
          style={{ fontSize: 16, lineHeight: 1, transform: pop ? "scale(1.3)" : undefined, transition: "transform 0.2s" }}
          aria-hidden
        >
          🔥
        </span>
        <span style={{ color: "var(--amber-bright)", fontSize: 18, fontWeight: 700 }}>
          {stats.streak}
        </span>
      </div>

      <Divider />

      <Stat
        label="ACCURACY"
        value={`${accuracyPct}%`}
        color={
          accuracyPct >= 90
            ? "var(--success-bright)"
            : accuracyPct >= 70
              ? "var(--amber-bright)"
              : "var(--danger-bright)"
        }
      />

      <Divider />

      <Stat label="PACE" value={`${stats.pace}/hr`} color="var(--color-text-primary)" />

      <Divider />

      <Stat
        label="PICKS"
        value={`${stats.picksCompleted}/${stats.picksTotal}`}
        color="var(--color-text-primary)"
      />

      {stats.multiplierActive && (
        <span
          className="ml-1 px-2 py-0.5 rounded text-xs font-bold pulse-amber"
          style={{ background: "var(--amber-bright)", color: "var(--navy)" }}
        >
          1.5× ON FIRE
        </span>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span style={{ color, fontSize: 18, fontWeight: 700 }}>{value}</span>
      <span
        style={{
          color: "var(--color-text-muted)",
          fontSize: 9,
          letterSpacing: "0.1em",
          marginTop: 2,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function Divider() {
  return <span style={{ width: 1, height: 22, background: "var(--color-border)" }} />
}
