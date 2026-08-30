"use client"

/**
 * WarehouseMap — Top-down 2D warehouse map with animated pick routing
 * (Overhaul 1A)
 *
 * Renders a top-down SVG of the active zone: labeled aisles as vertical
 * corridors, bays as cells, the active pick location pulsing in accent color,
 * a faded breadcrumb trail of completed picks, and a cart icon that animates
 * (CSS transform tween) to the current pick location as the picker advances.
 *
 * Pure presentation. Everything is DERIVED from session.pickQueue +
 * session.currentPickIndex — no engine coupling, no business logic.
 *
 * Routing: picks are grouped into aisle columns (sorted), and within each
 * aisle ordered by bay. Alternating aisle direction produces the serpentine
 * (snake) path real warehouse pick paths follow.
 */

import { useMemo, useState, useRef, useEffect } from "react"
import {
  DifficultyLevel,
  Zone,
  type PickTask,
  type SimulationSession,
} from "@/types/domain"

export interface WarehouseMapProps {
  session: SimulationSession
  difficulty?: DifficultyLevel
  /** SVG width in px (default 300). */
  width?: number
  /** SVG height in px (default 360). */
  height?: number
}

interface PlottedPick {
  task: PickTask
  /** Original index into pickQueue. */
  index: number
  x: number
  y: number
  aisle: string
}

const PADDING = 28
const CART = 14

/** Hazmat zone gets a distinct warning treatment. */
function isHazZone(zone: Zone): boolean {
  return zone === Zone.HAZ
}

export function WarehouseMap({
  session,
  difficulty = DifficultyLevel.BEGINNER,
  width = 300,
  height = 360,
}: WarehouseMapProps) {
  const zone = session.cart.zone
  const haz = isHazZone(zone)

  const { plotted, aisles } = useMemo(
    () => plotPicks(session.pickQueue, width, height),
    [session.pickQueue, width, height]
  )

  const currentIndex = Math.min(
    session.currentPickIndex,
    session.pickQueue.length - 1
  )
  const current = plotted.find((p) => p.index === currentIndex) ?? plotted[0]

  // Pan and Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom around center for simplicity
    const newScale = Math.min(Math.max(0.5, transform.scale - e.deltaY * 0.005), 4)
    setTransform((t) => ({ ...t, scale: newScale }))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y }
    if (svgRef.current) svgRef.current.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setTransform((t) => ({ ...t, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    if (svgRef.current) svgRef.current.releasePointerCapture(e.pointerId)
  }

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(4, t.scale + 0.2) }))
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(0.5, t.scale - 0.2) }))
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 })

  // Breadcrumb path string through all plotted picks (serpentine order).
  const pathD = useMemo(() => {
    if (plotted.length === 0) return ""
    return plotted
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ")
  }, [plotted])

  const accent = haz ? "var(--amber-bright)" : "var(--ice-blue)"

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{
        background: "var(--warehouse-floor)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: "var(--font-display)", color: "var(--ice-white)" }}
        >
          Warehouse Map
        </h3>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-terminal)",
            color: haz ? "var(--navy)" : "var(--ice-white)",
            background: haz ? "var(--amber-bright)" : "var(--color-surface-2)",
          }}
        >
          {haz ? "⚠ " : ""}Zone {zone}
        </span>
      </div>

      <div className="relative overflow-hidden" style={{ borderRadius: 8, background: "#1f1f1f" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ display: "block", cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
          role="img"
          aria-label={`Top-down map of zone ${zone} pick path`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Hazmat striped backdrop */}
            {haz && (
          <>
            <defs>
              <pattern id="hazStripes" width="14" height="14" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="14" height="14" fill="#1f1f1f" />
                <rect width="7" height="14" fill="rgba(245,166,35,0.10)" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="url(#hazStripes)" />
          </>
        )}

        {/* Aisle corridors + labels */}
        {aisles.map((a) => (
          <g key={a.name}>
            <rect
              x={a.x - 16}
              y={PADDING - 10}
              width={32}
              height={height - PADDING * 2 + 20}
              rx={4}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.06)"
            />
            <text
              x={a.x}
              y={16}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-terminal)", fontSize: 9, fill: "var(--concrete)" }}
            >
              {a.name}
            </text>
          </g>
        ))}

        {/* Serpentine path (breadcrumb base) */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={2}
            strokeDasharray="3 4"
          />
        )}

        {/* Completed breadcrumb (faded accent up to current) */}
        {plotted.length > 1 && (
          <path
            d={plotted
              .filter((p) => p.index <= currentIndex)
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke={accent}
            strokeWidth={2}
            opacity={0.45}
          />
        )}

        {/* Pick location markers */}
        {plotted.map((p) => {
          const done = p.index < currentIndex
          const active = p.index === currentIndex
          const showHighlight = active && difficulty !== DifficultyLevel.ADVANCED
          return (
            <g key={p.index}>
              {showHighlight && (
                <circle cx={p.x} cy={p.y} r={11} fill="none" stroke={accent} strokeWidth={1.5}>
                  <animate attributeName="r" values="7;14;7" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
              <rect
                x={p.x - 5}
                y={p.y - 5}
                width={10}
                height={10}
                rx={2}
                fill={done ? "var(--success-bright)" : active ? accent : "var(--concrete)"}
                opacity={done ? 0.7 : 1}
              />
            </g>
          )
        })}

        {/* Animated cart icon */}
        {current && (
          <g
            style={{
              transform: `translate(${current.x - CART / 2}px, ${current.y - CART / 2}px)`,
              transition: "transform 600ms cubic-bezier(0.25,0.46,0.45,0.94)",
            }}
          >
            <rect
              x={0}
              y={0}
              width={CART}
              height={CART}
              rx={3}
              fill="var(--ice-white)"
              stroke="var(--navy)"
              strokeWidth={1.5}
            />
            <circle cx={3} cy={CART + 1} r={1.6} fill="var(--navy)" />
            <circle cx={CART - 3} cy={CART + 1} r={1.6} fill="var(--navy)" />
          </g>
        )}
        </g>
      </svg>

        {/* Map Controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 bg-black/70 p-1.5 rounded-lg backdrop-blur z-10 border border-slate-700">
          <button
            type="button"
            onClick={zoomIn}
            aria-label="Zoom in warehouse map"
            className="touch-target min-w-[36px] min-h-[36px] flex items-center justify-center text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded font-mono font-bold text-sm"
          >
            +
          </button>
          <button
            type="button"
            onClick={zoomOut}
            aria-label="Zoom out warehouse map"
            className="touch-target min-w-[36px] min-h-[36px] flex items-center justify-center text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded font-mono font-bold text-sm"
          >
            -
          </button>
          <button
            type="button"
            onClick={resetZoom}
            aria-label="Reset map zoom"
            className="touch-target min-w-[36px] min-h-[36px] flex items-center justify-center text-amber-400 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded font-mono text-xs font-bold"
          >
            R
          </button>
        </div>
      </div>

      <p
        className="text-[10px] text-center"
        style={{ fontFamily: "var(--font-terminal)", color: "var(--concrete)" }}
      >
        {current
          ? `→ ${current.task.location.displayLabel}`
          : "Round complete"}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING / LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plot picks onto a serpentine grid. Aisles become evenly-spaced columns
 * (sorted), and within each aisle picks are ordered by bay number. The
 * vertical direction alternates per aisle to form the snake path.
 */
function plotPicks(
  pickQueue: PickTask[],
  width: number,
  height: number
): { plotted: PlottedPick[]; aisles: { name: string; x: number }[] } {
  if (pickQueue.length === 0) return { plotted: [], aisles: [] }

  // Group original indices by aisle.
  const byAisle = new Map<string, { task: PickTask; index: number }[]>()
  pickQueue.forEach((task, index) => {
    const aisle = task.location.aisle || task.location.displayLabel.split("-")[0] || "A"
    if (!byAisle.has(aisle)) byAisle.set(aisle, [])
    byAisle.get(aisle)!.push({ task, index })
  })

  const aisleNames = Array.from(byAisle.keys()).sort()
  const colCount = aisleNames.length
  const usableW = width - PADDING * 2
  const usableH = height - PADDING * 2
  const colGap = colCount > 1 ? usableW / (colCount - 1) : 0

  const aisles = aisleNames.map((name, c) => ({
    name,
    x: PADDING + (colCount > 1 ? c * colGap : usableW / 2),
  }))

  const plotted: PlottedPick[] = []

  aisleNames.forEach((name, c) => {
    const x = aisles[c].x
    const picks = byAisle.get(name)!
    // Sort by bay number for logical travel order within the aisle.
    picks.sort((a, b) => bayNum(a.task) - bayNum(b.task))
    const n = picks.length
    const rowGap = n > 1 ? usableH / (n - 1) : 0
    picks.forEach((p, r) => {
      // Serpentine: even aisles top→bottom, odd aisles bottom→top.
      const row = c % 2 === 0 ? r : n - 1 - r
      const y = PADDING + (n > 1 ? row * rowGap : usableH / 2)
      plotted.push({ task: p.task, index: p.index, x, y, aisle: name })
    })
  })

  // Re-sort plotted into actual travel order: aisle column, then serpentine row.
  plotted.sort((a, b) => {
    const ca = aisleNames.indexOf(a.aisle)
    const cb = aisleNames.indexOf(b.aisle)
    if (ca !== cb) return ca - cb
    return ca % 2 === 0 ? a.y - b.y : b.y - a.y
  })

  return { plotted, aisles }
}

/** Extract a numeric bay from the location for ordering. */
function bayNum(task: PickTask): number {
  const raw = task.location.bay || task.location.displayLabel.split("-")[1] || "0"
  const n = parseInt(raw.replace(/\D/g, ""), 10)
  return Number.isNaN(n) ? 0 : n
}
