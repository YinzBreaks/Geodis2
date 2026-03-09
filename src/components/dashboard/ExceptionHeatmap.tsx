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
  if (rate >= 0.9) return { bar: "#2ea043", text: "var(--color-success, #2ea043)" }
  if (rate >= 0.7) return { bar: "#f0a500", text: "var(--color-amber, #f0a500)" }
  return { bar: "#f85149", text: "var(--color-danger, #f85149)" }
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
      <table style={{ width: "100%", fontSize: 12, fontFamily: "var(--font-mono)", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>
            <th style={{ textAlign: "left", padding: "8px" }}>Exception</th>
            {showSopRef && <th style={{ textAlign: "left", padding: "8px" }}>SOP</th>}
            <th style={{ textAlign: "right", padding: "8px" }}>Seen</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Resolved</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Rate</th>
            <th style={{ padding: "8px", width: 128 }}>Progress</th>
            <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
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
                style={{ borderBottom: "1px solid rgba(48, 54, 61, 0.5)" }}
              >
                <td style={{ padding: "8px", color: "var(--color-text-primary)" }}>{meta.label}</td>
                {showSopRef && (
                  <td style={{ padding: "8px", color: "var(--color-text-secondary)" }}>{meta.sopRef}</td>
                )}
                <td style={{ padding: "8px", textAlign: "right", color: "var(--color-text-primary)" }}>
                  {stats.encountered}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: "var(--color-text-primary)" }}>
                  {stats.resolvedCorrectly}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: colors.text }}>
                  {stats.encountered > 0
                    ? `${Math.round(stats.resolutionRate * 100)}%`
                    : "—"}
                </td>
                <td style={{ padding: "8px" }}>
                  <div style={{ width: "100%", backgroundColor: "var(--color-surface-2)", borderRadius: 99, height: 8 }}>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 99,
                        backgroundColor: colors.bar,
                        width: `${Math.round(stats.resolutionRate * 100)}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </td>
                <td
                  style={{
                    padding: "8px",
                    color: stats.encountered === 0 ? "var(--color-text-secondary)" : colors.text,
                  }}
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
