/**
 * ScoreTrendChart.tsx — Line chart showing score trends over time
 *
 * Uses recharts LineChart with:
 * - Primary line: finalScore per session
 * - Dotted threshold line at y=75 (passing)
 * - Optional secondary line for accuracy or pass rate
 *
 * Reusable for both cohort (supervisor dashboard) and individual trainee views.
 * Per CLAUDE.md §Architecture: components render only — no business logic.
 */
"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A single data point for the score trend chart. */
export interface ScoreDataPoint {
  /** X-axis label (date string or session index) */
  label: string
  /** Primary metric: final score (0–100) */
  score: number
  /** Optional: accuracy score (0–100) */
  accuracy?: number
  /** Optional: cohort pass rate (0–100) */
  passRate?: number
  /** Optional: speed score (0–100) */
  speed?: number
  /** Whether this session was passed */
  passed?: boolean
  /** Date for tooltip */
  date?: string
  /** Duration string for tooltip */
  duration?: string
}

/** Props for the ScoreTrendChart component. */
export interface ScoreTrendChartProps {
  /** Array of data points in chronological order */
  data: ScoreDataPoint[]
  /** Passing threshold line (default: 75) */
  threshold?: number
  /** Show accuracy line */
  showAccuracy?: boolean
  /** Show pass rate % line (amber, dashed) */
  showPassRate?: boolean
  /** Show speed line */
  showSpeed?: boolean
  /** Chart height in pixels (default: 300) */
  height?: number
  /** Chart title */
  title?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomScoreTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 12, boxShadow: 'var(--shadow-md)' }}>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: entry.color }}
        >
          {entry.name}: {Math.round(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Recharts-based score trend line chart with passing threshold line. */
export function ScoreTrendChart({
  data,
  threshold = 75,
  showAccuracy = false,
  showPassRate = false,
  showSpeed = false,
  height = 300,
  title,
}: ScoreTrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
      >
        No score data available
      </div>
    )
  }

  return (
    <div>
      {title && (
        <h3 style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 12 }}>{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #30363d)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8b949e", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            stroke="var(--color-border, #30363d)"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#8b949e", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            stroke="var(--color-border, #30363d)"
          />
          <Tooltip content={<CustomScoreTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: "11px",
              fontFamily: "monospace",
              color: "#a1a1aa",
            }}
          />

          {/* Passing threshold line */}
          <ReferenceLine
            y={threshold}
            stroke="#f0a500"
            strokeDasharray="6 4"
            label={{
              value: `Pass: ${threshold}`,
              fill: "#f0a500",
              fontSize: 10,
              fontFamily: "var(--font-mono, monospace)",
            }}
          />

          {/* Primary: Final Score */}
          <Line
            type="monotone"
            dataKey="score"
            name="Final Score"
            stroke="#f0a500"
            strokeWidth={2}
            dot={{ r: 4, fill: "#f0a500" }}
            activeDot={{ r: 6 }}
          />

          {/* Optional: Accuracy */}
          {showAccuracy && (
            <Line
              type="monotone"
              dataKey="accuracy"
              name="Accuracy"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: "#3b82f6" }}
            />
          )}

          {/* Optional: Speed */}
          {showSpeed && (
            <Line
              type="monotone"
              dataKey="speed"
              name="Speed"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: "#a855f7" }}
            />
          )}

          {/* Optional: Pass Rate */}
          {showPassRate && (
            <Line
              type="monotone"
              dataKey="passRate"
              name="Pass Rate %"
              stroke="#2ea043"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: "#2ea043" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
