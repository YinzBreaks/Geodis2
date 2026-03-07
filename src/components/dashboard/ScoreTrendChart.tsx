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
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg">
      <p className="text-zinc-400 text-xs font-mono mb-1">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="text-xs font-mono"
          style={{ color: entry.color }}
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
        className="flex items-center justify-center text-zinc-600 font-mono text-sm"
        style={{ height }}
      >
        No score data available
      </div>
    )
  }

  return (
    <div>
      {title && (
        <h3 className="text-zinc-400 font-mono text-sm mb-3">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
            stroke="#3f3f46"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
            stroke="#3f3f46"
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
            stroke="#eab308"
            strokeDasharray="6 4"
            label={{
              value: `Pass: ${threshold}`,
              fill: "#eab308",
              fontSize: 10,
              fontFamily: "monospace",
            }}
          />

          {/* Primary: Final Score */}
          <Line
            type="monotone"
            dataKey="score"
            name="Final Score"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 4, fill: "#22c55e" }}
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
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: "#f59e0b" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
