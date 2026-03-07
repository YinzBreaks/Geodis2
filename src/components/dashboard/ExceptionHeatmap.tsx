/**
 * ExceptionHeatmap.tsx — Exception type heatmap table
 *
 * One row per exception type (all 8 from BBWD-WI-030 §6).
 * Columns: Exception name | Encountered | Resolved | Rate | Progress bar | Status
 * Color coding: ≥90% green, 70–89% amber, <70% red
 *
 * Per CLAUDE.md §Architecture: components render only — no business logic.
 */
"use client"

import type { ExceptionStats } from "@/lib/floorReadiness"
import { ScanResult } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Props for the ExceptionHeatmap component. */
export interface ExceptionHeatmapProps {
  /** ExceptionStats keyed by ScanResult. */
  coverage: Record<string, ExceptionStats>
  /** Whether to show the SOP reference column. */
  showSopRef?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEPTION METADATA — per BBWD-WI-030 §6
// ─────────────────────────────────────────────────────────────────────────────

interface ExceptionMeta {
  scanResult: string
  label: string
  sopRef: string
}

const EXCEPTION_META: ExceptionMeta[] = [
  { scanResult: ScanResult.TOTE_ALLOCATED, label: "Tote Already Allocated", sopRef: "§6.1" },
  { scanResult: ScanResult.CART_ALLOCATED, label: "Pick Cart Already Created", sopRef: "§6.2" },
  { scanResult: ScanResult.WRONG_LOCATION, label: "Incorrect Location", sopRef: "§6.3" },
  { scanResult: ScanResult.WRONG_TOTE, label: "Incorrect Tote", sopRef: "§6.4" },
  { scanResult: ScanResult.WRONG_ITEM, label: "Invalid Item", sopRef: "§6.5" },
  { scanResult: ScanResult.ITEM_NOT_FOUND, label: "Short Inventory", sopRef: "§6.6" },
  { scanResult: ScanResult.ITEM_DAMAGED, label: "Damaged Item", sopRef: "§6.7" },
  { scanResult: ScanResult.TIMEOUT, label: "Scan Timeout", sopRef: "§6.8" },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRateColor(rate: number): { bar: string; text: string } {
  if (rate >= 0.9) return { bar: "bg-green-500", text: "text-green-400" }
  if (rate >= 0.7) return { bar: "bg-yellow-500", text: "text-yellow-400" }
  return { bar: "bg-red-500", text: "text-red-400" }
}

function getStatusLabel(rate: number, encountered: number): string {
  if (encountered === 0) return "Not seen"
  if (rate >= 0.9) return "Proficient"
  if (rate >= 0.7) return "Developing"
  return "Needs work"
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Heatmap table showing exception resolution rates per type. */
export function ExceptionHeatmap({
  coverage,
  showSopRef = false,
}: ExceptionHeatmapProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-2 px-2">Exception</th>
            {showSopRef && <th className="text-left py-2 px-2">SOP</th>}
            <th className="text-right py-2 px-2">Seen</th>
            <th className="text-right py-2 px-2">Resolved</th>
            <th className="text-right py-2 px-2">Rate</th>
            <th className="py-2 px-2 w-32">Progress</th>
            <th className="text-left py-2 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {EXCEPTION_META.map((meta) => {
            const stats = coverage[meta.scanResult] ?? {
              encountered: 0,
              resolvedCorrectly: 0,
              resolutionRate: 0,
            }
            const colors = getRateColor(stats.resolutionRate)
            const statusLabel = getStatusLabel(
              stats.resolutionRate,
              stats.encountered
            )

            return (
              <tr
                key={meta.scanResult}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
              >
                <td className="py-2 px-2 text-zinc-300">{meta.label}</td>
                {showSopRef && (
                  <td className="py-2 px-2 text-zinc-500">{meta.sopRef}</td>
                )}
                <td className="py-2 px-2 text-right text-zinc-300">
                  {stats.encountered}
                </td>
                <td className="py-2 px-2 text-right text-zinc-300">
                  {stats.resolvedCorrectly}
                </td>
                <td className={`py-2 px-2 text-right ${colors.text}`}>
                  {stats.encountered > 0
                    ? `${Math.round(stats.resolutionRate * 100)}%`
                    : "—"}
                </td>
                <td className="py-2 px-2">
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors.bar} transition-all`}
                      style={{
                        width: `${Math.round(stats.resolutionRate * 100)}%`,
                      }}
                    />
                  </div>
                </td>
                <td
                  className={`py-2 px-2 ${
                    stats.encountered === 0 ? "text-zinc-600" : colors.text
                  }`}
                >
                  {statusLabel}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
