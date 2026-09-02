"use client"

import React, { useMemo } from "react"
import type { SimulationSession } from "@/types/domain"
import type { SpatialLocation } from "@/types/routing"
import {
  generateOptimalPolyline,
  generateActualPathPolyline,
  getCartNodePosition,
} from "@/types/routing"

export interface SerpentineRouteMapProps {
  session: SimulationSession
  width?: number
  height?: number
}

const BAYS = [
  { id: "01", y: 30, label: "BAY 01" },
  { id: "02", y: 90, label: "BAY 02" },
  { id: "03", y: 150, label: "BAY 03" },
  { id: "04", y: 210, label: "BAY 04" },
]

export function SerpentineRouteMap({
  session,
  width = 320,
  height = 270,
}: SerpentineRouteMapProps) {
  const currentPick = session.pickQueue[session.currentPickIndex]
  const currentPickLocation = currentPick?.location as SpatialLocation | undefined

  // Scale internal coordinates (y: 10m-70m to SVG viewBox 0-260)
  const mapY = (rawY: number) => 15 + rawY * 3.2
  const mapX = (rawX: number) => (rawX === 20 ? 45 : 235)

  // Map locations to scaled SVG coordinate points
  const optimalPoints = useMemo(() => {
    return session.pickQueue
      .map((p) => {
        const spatial = (p.location as SpatialLocation)?.spatial
        if (!spatial) return null
        return { x: mapX(spatial.x), y: mapY(spatial.y) }
      })
      .filter((pt): pt is { x: number; y: number } => Boolean(pt))
  }, [session.pickQueue])

  const actualPoints = useMemo(() => {
    return session.completedPicks
      .map((p) => {
        const task = session.pickQueue.find((t) => t.pickTaskId === p.pickTaskId)
        const spatial = (task?.location as SpatialLocation)?.spatial
        if (!spatial) return null
        return { x: mapX(spatial.x), y: mapY(spatial.y) }
      })
      .filter((pt): pt is { x: number; y: number } => Boolean(pt))
  }, [session.completedPicks, session.pickQueue])

  // Current cart position in center corridor (x = 140)
  const cartY = currentPickLocation?.spatial
    ? mapY(currentPickLocation.spatial.y)
    : 30

  const optimalPolylineStr = optimalPoints
    .map((pt) => `${pt.x},${pt.y}`)
    .join(" ")
  const actualPolylineStr = actualPoints
    .map((pt) => `${pt.x},${pt.y}`)
    .join(" ")

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-inner flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-2 px-1 text-[11px] font-mono">
        <span className="text-amber-400 font-bold tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          OVERHEAD S-CURVE ROUTE
        </span>
        <span className="text-slate-400">AISLE 316 (BAYS 01–04)</span>
      </div>

      <svg
        viewBox="0 0 280 250"
        className="w-full h-auto max-h-[260px] select-none"
        style={{ width, height }}
      >
        {/* Corridor Background */}
        <rect
          x="90"
          y="10"
          width="100"
          height="230"
          fill="#090d16"
          stroke="#1e293b"
          strokeDasharray="4 4"
          rx="6"
        />

        {/* Center Corridor Guideline */}
        <line
          x1="140"
          y1="15"
          x2="140"
          y2="235"
          stroke="#334155"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Left Racking (Aisle 316 Left Face) */}
        <rect
          x="10"
          y="10"
          width="70"
          height="230"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="1"
          rx="4"
        />
        <text
          x="45"
          y="22"
          fill="#64748b"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
        >
          LEFT FACE
        </text>

        {/* Right Racking (Aisle 316 Right Face) */}
        <rect
          x="200"
          y="10"
          width="70"
          height="230"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="1"
          rx="4"
        />
        <text
          x="235"
          y="22"
          fill="#64748b"
          fontSize="8"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="monospace"
        >
          RIGHT FACE
        </text>

        {/* Bay Shelf Cells */}
        {BAYS.map((bay) => (
          <g key={bay.id}>
            {/* Left Bay Slot */}
            <rect
              x="14"
              y={bay.y}
              width="62"
              height="38"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1"
              rx="3"
            />
            <text
              x="45"
              y={bay.y + 16}
              fill="#94a3b8"
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {bay.label}
            </text>
            <text
              x="45"
              y={bay.y + 28}
              fill="#64748b"
              fontSize="7"
              textAnchor="middle"
              fontFamily="monospace"
            >
              LVL A &bull; B
            </text>

            {/* Right Bay Slot */}
            <rect
              x="204"
              y={bay.y}
              width="62"
              height="38"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1"
              rx="3"
            />
            <text
              x="235"
              y={bay.y + 16}
              fill="#94a3b8"
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {bay.label}
            </text>
            <text
              x="235"
              y={bay.y + 28}
              fill="#64748b"
              fontSize="7"
              textAnchor="middle"
              fontFamily="monospace"
            >
              LVL A &bull; B
            </text>
          </g>
        ))}

        {/* Planned Optimal Serpentine Path (Dashed Amber) */}
        {optimalPolylineStr && (
          <polyline
            points={optimalPolylineStr}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.7"
          />
        )}

        {/* Actual Trainee Path (Solid Cyan Breadcrumb) */}
        {actualPolylineStr && (
          <polyline
            points={actualPolylineStr}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Pick Locations Markers */}
        {optimalPoints.map((pt, idx) => {
          const isDone = idx < session.currentPickIndex
          const isCurrent = idx === session.currentPickIndex
          return (
            <circle
              key={`pick-node-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={isCurrent ? 5.5 : 3.5}
              fill={isDone ? "#10b981" : isCurrent ? "#f59e0b" : "#475569"}
              stroke={isCurrent ? "#ffffff" : "#1e293b"}
              strokeWidth={isCurrent ? 2 : 1}
            />
          )
        })}

        {/* Current Cart Node in Corridor with 9-Tote Mini-Grid */}
        <g transform={`translate(140, ${cartY})`}>
          {/* Cart Frame */}
          <rect
            x="-18"
            y="-14"
            width="36"
            height="28"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1.5"
            rx="3"
          />

          {/* 3x3 Tote Slots: Tier 3 (top: 7,8,9), Tier 2 (mid: 4,5,6), Tier 1 (bottom: 1,2,3) */}
          {[
            // Tier 3 (Top)
            { slot: 7, x: -14, y: -11 },
            { slot: 8, x: -4, y: -11 },
            { slot: 9, x: 6, y: -11 },
            // Tier 2 (Middle)
            { slot: 4, x: -14, y: -3 },
            { slot: 5, x: -4, y: -3 },
            { slot: 6, x: 6, y: -3 },
            // Tier 1 (Bottom)
            { slot: 1, x: -14, y: 5 },
            { slot: 2, x: -4, y: 5 },
            { slot: 3, x: 6, y: 5 },
          ].map(({ slot, x, y }) => {
            const targetSlot = currentPick?.targetSlot
            const isTarget = slot === targetSlot
            const tote = session.cart.totes.find((t) => t.slot === slot)
            const hasPicks = (tote?.pickedItems.length ?? 0) > 0

            return (
              <rect
                key={`tote-cell-${slot}`}
                x={x}
                y={y}
                width="8"
                height="6"
                rx="1"
                fill={isTarget ? "#f59e0b" : hasPicks ? "#10b981" : "#334155"}
                stroke={isTarget ? "#ffffff" : "#1e293b"}
                strokeWidth={isTarget ? 0.8 : 0.4}
              />
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="w-full flex justify-around text-[9px] font-mono text-slate-400 mt-2 border-t border-slate-800/80 pt-1.5">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-amber-500 border border-dashed border-amber-400" />
          Optimal S-Curve
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-0.5 bg-cyan-400" />
          Actual Trail
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Cart Position
        </span>
      </div>
    </div>
  )
}
