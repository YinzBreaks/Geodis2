"use client"

/**
 * BlueprintMap — Interactive architectural-blueprint warehouse floor plan.
 *
 * Replaces the old top-down "pick path" map (which was unreadable for
 * single-aisle scenarios). This renders the whole facility as a clean
 * blueprint: labeled zone blocks (Z1–Z4, HAZ), a Command Center, and the
 * Putwall conveyor.
 *
 * ENGAGEMENT MECHANIC — the trainee TRAVELS by clicking:
 *   • During BC_TRAVEL_TO_COMMAND_CENTER → the Command Center glows; clicking
 *     it fires the engine CONFIRM (advances the step).
 *   • During PK_TRAVEL_TO_LOCATION → the zone holding the current pick glows;
 *     clicking the correct zone fires CONFIRM.
 *   • Clicking the WRONG area gives local "wrong zone" feedback and does NOT
 *     advance or record an engine error.
 *
 * Pure presentation: everything is DERIVED from the session. No engine logic
 * lives here (per CLAUDE.md §Architecture). Advancing is delegated to the
 * `onArrive` callback supplied by the page.
 */

import { useCallback, useRef, useState } from "react"
import {
  WorkflowStep,
  Zone,
  DifficultyLevel,
  type SimulationSession,
} from "@/types/domain"

export interface BlueprintMapProps {
  session: SimulationSession
  difficulty?: DifficultyLevel
  /** Dispatch the CONFIRM action for the active travel step (advances engine). */
  onArrive: () => void
}

type RegionKind = "zone" | "command"

interface Region {
  id: string
  label: string
  sub: string
  x: number
  y: number
  w: number
  h: number
  kind: RegionKind
  /** The physical zone this region represents (omitted for the Command Center). */
  zone?: Zone
}

// Blueprint coordinate space — everything is plotted in this viewBox and then
// scaled responsively to the container.
const VIEW_W = 960
const VIEW_H = 560

const REGIONS: readonly Region[] = [
  { id: "Z1", label: "ZONE 1", sub: "AISLE 316", x: 70, y: 76, w: 182, h: 150, kind: "zone", zone: Zone.Z1 },
  { id: "Z2", label: "ZONE 2", sub: "AISLE 412", x: 270, y: 76, w: 182, h: 150, kind: "zone", zone: Zone.Z2 },
  { id: "Z3", label: "ZONE 3", sub: "AISLE 508", x: 470, y: 76, w: 182, h: 150, kind: "zone", zone: Zone.Z3 },
  { id: "Z4", label: "ZONE 4", sub: "AISLE 612", x: 670, y: 76, w: 182, h: 150, kind: "zone", zone: Zone.Z4 },
  { id: "CMD", label: "COMMAND CENTER", sub: "TASKER / CSR", x: 150, y: 300, w: 300, h: 120, kind: "command" },
  { id: "HAZ", label: "HAZ ZONE", sub: "AISLE 900", x: 628, y: 286, w: 224, h: 148, kind: "zone", zone: Zone.HAZ },
]

const WALL = { x: 28, y: 34, w: 904, h: 498 }
const PUTWALL = { x: 70, y: 482, w: 782, h: 36 }

/** Origin point of the travel arrow, in viewBox coords. */
const DOCK_ANCHOR = { x: 46, y: 360 }

function centerOf(r: { x: number; y: number; w: number; h: number }) {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function BlueprintMap({
  session,
  difficulty = DifficultyLevel.BEGINNER,
  onArrive,
}: BlueprintMapProps) {
  const step = session.currentStep
  const queueLen = session.pickQueue.length
  const idx = Math.min(session.currentPickIndex, Math.max(0, queueLen - 1))
  const currentPick = queueLen > 0 ? session.pickQueue[idx] : undefined
  const targetZone: Zone = currentPick?.location.zone ?? session.cart.zone

  const isTraveling =
    step === WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER ||
    step === WorkflowStep.PK_TRAVEL_TO_LOCATION

  // ADVANCED gets no visual hand-holding — the trainee must know the layout
  // and read the RF Device. Per the same rule the pick map follows.
  const showAids = difficulty !== DifficultyLevel.ADVANCED

  // Which region must the trainee click right now?
  const zoneRegionId = REGIONS.find((r) => r.zone === targetZone)?.id ?? null
  const travelTargetId: string | null =
    step === WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER
      ? "CMD"
      : step === WorkflowStep.PK_TRAVEL_TO_LOCATION
        ? zoneRegionId
        : null

  const [hoverId, setHoverId] = useState<string | null>(null)
  const [wrongId, setWrongId] = useState<string | null>(null)
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashWrong = useCallback((id: string) => {
    setWrongId(id)
    if (wrongTimer.current) clearTimeout(wrongTimer.current)
    wrongTimer.current = setTimeout(() => setWrongId(null), 750)
  }, [])

  const handleRegionActivate = useCallback(
    (r: Region) => {
      if (!isTraveling || !travelTargetId) return
      if (r.id === travelTargetId) {
        onArrive()
      } else {
        flashWrong(r.id)
      }
    },
    [isTraveling, travelTargetId, onArrive, flashWrong]
  )

  // Travel arrow endpoints
  const targetRegion = REGIONS.find((r) => r.id === travelTargetId) ?? null
  const cmdCenter = centerOf(REGIONS.find((r) => r.id === "CMD")!)
  const origin: { x: number; y: number } =
    step === WorkflowStep.PK_TRAVEL_TO_LOCATION
      ? { x: cmdCenter.cx, y: cmdCenter.cy }
      : DOCK_ANCHOR
  const targetCenter = targetRegion ? centerOf(targetRegion) : null

  // Status line
  const labelOf = (id: string | null) =>
    REGIONS.find((r) => r.id === id)?.label ?? "—"
  const aisleOf = (zone: Zone) =>
    REGIONS.find((r) => r.zone === zone)?.sub ?? ""

  let statusText: string
  let statusTone: "go" | "info" | "wrong" = "info"
  if (wrongId) {
    statusText = `Wrong area — that's ${labelOf(wrongId)}. Travel to ${labelOf(travelTargetId)}.`
    statusTone = "wrong"
  } else if (isTraveling && travelTargetId === "CMD") {
    statusText = "Destination: COMMAND CENTER — tap it on the blueprint to walk over."
    statusTone = "go"
  } else if (isTraveling && targetRegion) {
    const pickInfo = currentPick
      ? ` · Pick ${idx + 1}/${queueLen} @ ${currentPick.location.displayLabel}`
      : ""
    statusText = showAids
      ? `Destination: ${targetRegion.label} (${aisleOf(targetZone)}) — tap the glowing zone${pickInfo}`
      : `Travel step — tap the correct zone on the blueprint (no hints on Advanced)${pickInfo}`
    statusTone = "go"
  } else {
    statusText = `Picking in ${labelOf(zoneRegionId)} — follow the RF Device. Travel steps unlock the map.`
    statusTone = "info"
  }

  const toneColor =
    statusTone === "go"
      ? "var(--color-amber)"
      : statusTone === "wrong"
        ? "var(--danger-bright)"
        : "var(--ice-blue)"

  return (
    <div
      className="rounded-xl border flex flex-col overflow-hidden"
      style={{
        height: "100%",
        background: "#0a2342",
        borderColor: "rgba(120,170,220,0.35)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid rgba(120,170,220,0.22)" }}
      >
        <div className="flex flex-col leading-tight">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ fontFamily: "var(--font-display)", color: "#e8f4fd", letterSpacing: "0.16em" }}
          >
            Warehouse Blueprint
          </span>
          <span
            className="text-[9px] uppercase"
            style={{ fontFamily: "var(--font-terminal)", color: "rgba(200,225,250,0.55)", letterSpacing: "0.12em" }}
          >
            GEODIS BBWD · Outbound Phase II
          </span>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-terminal)",
            color: targetZone === Zone.HAZ ? "#0a2342" : "#e8f4fd",
            background:
              targetZone === Zone.HAZ ? "var(--amber-bright)" : "rgba(75,156,211,0.25)",
            border: "1px solid rgba(120,190,235,0.4)",
          }}
        >
          {targetZone === Zone.HAZ ? "⚠ " : ""}Zone {targetZone}
        </span>
      </div>

      {/* Blueprint canvas */}
      <div className="relative" style={{ flex: 1, minHeight: 0 }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={`Interactive blueprint of the warehouse. ${statusText}`}
          style={{ display: "block", position: "absolute", inset: 0 }}
        >
          <defs>
            <pattern id="bpGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0 H0 V32" fill="none" stroke="rgba(140,190,235,0.10)" strokeWidth="1" />
            </pattern>
            <pattern id="bpGridMajor" width="160" height="160" patternUnits="userSpaceOnUse">
              <path d="M160 0 H0 V160" fill="none" stroke="rgba(140,190,235,0.16)" strokeWidth="1.2" />
            </pattern>
            <pattern id="bpHaz" width="16" height="16" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="transparent" />
              <rect width="8" height="16" fill="rgba(245,166,35,0.16)" />
            </pattern>
            <filter id="bpGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="bpArrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-amber)" />
            </marker>
          </defs>

          {/* Background + grid */}
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#0a2342" />
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#bpGrid)" />
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#bpGridMajor)" />

          {/* Building outer wall */}
          <rect
            x={WALL.x}
            y={WALL.y}
            width={WALL.w}
            height={WALL.h}
            rx={4}
            fill="none"
            stroke="rgba(200,225,250,0.55)"
            strokeWidth={3}
          />

          {/* Receiving dock doors on the left wall */}
          {[0, 1, 2].map((i) => (
            <rect
              key={`dock-${i}`}
              x={WALL.x - 3}
              y={326 + i * 34}
              width={6}
              height={20}
              fill="rgba(200,225,250,0.5)"
            />
          ))}
          <text
            x={WALL.x + 12}
            y={300}
            transform={`rotate(-90 ${WALL.x + 12} 300)`}
            style={{ fontFamily: "var(--font-terminal)", fontSize: 11, fill: "rgba(200,225,250,0.4)", letterSpacing: "0.14em" }}
          >
            RECEIVING DOCK
          </text>

          {/* Putwall / conveyor */}
          <g>
            <rect
              x={PUTWALL.x}
              y={PUTWALL.y}
              width={PUTWALL.w}
              height={PUTWALL.h}
              rx={3}
              fill="rgba(75,156,211,0.08)"
              stroke="rgba(120,190,235,0.4)"
              strokeWidth={1.4}
              strokeDasharray="7 5"
            />
            {Array.from({ length: 12 }).map((_, i) => (
              <text
                key={`chev-${i}`}
                x={PUTWALL.x + 26 + i * 64}
                y={PUTWALL.y + 24}
                style={{ fontFamily: "var(--font-terminal)", fontSize: 14, fill: "rgba(120,190,235,0.45)" }}
              >
                ›
              </text>
            ))}
            <text
              x={PUTWALL.x + PUTWALL.w / 2}
              y={PUTWALL.y + 23}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-display)", fontSize: 13, fill: "rgba(200,225,250,0.7)", letterSpacing: "0.18em" }}
            >
              PUTWALL · CONVEYOR
            </text>
          </g>

          {/* Travel route arrow (only while a travel step is active, and only
              when hints are enabled for this difficulty) */}
          {isTraveling && targetCenter && showAids && (
            <g>
              <line
                x1={origin.x}
                y1={origin.y}
                x2={targetCenter.cx}
                y2={targetCenter.cy}
                stroke="var(--color-amber)"
                strokeWidth={2.5}
                strokeDasharray="9 7"
                markerEnd="url(#bpArrow)"
                opacity={0.92}
              >
                <animate attributeName="stroke-dashoffset" from="32" to="0" dur="0.8s" repeatCount="indefinite" />
              </line>
              <circle cx={origin.x} cy={origin.y} r={6} fill="var(--ice-white)" stroke="var(--navy)" strokeWidth={1.5} />
            </g>
          )}

          {/* Zone / command regions */}
          {REGIONS.map((r) => {
            const { cx, cy } = centerOf(r)
            const isTarget = isTraveling && r.id === travelTargetId
            // Visual emphasis for the destination is suppressed on ADVANCED.
            const isTargetAid = isTarget && showAids
            const isActiveZone = !isTraveling && r.kind === "zone" && r.zone === targetZone
            const isWrong = wrongId === r.id
            const isHover = hoverId === r.id
            const clickable = isTraveling

            let stroke = "rgba(200,225,250,0.42)"
            let fill = "rgba(120,170,220,0.05)"
            if (isWrong) {
              stroke = "var(--danger-bright)"
              fill = "rgba(231,76,60,0.18)"
            } else if (isTargetAid) {
              stroke = "var(--color-amber)"
              fill = "rgba(240,165,0,0.14)"
            } else if (isActiveZone) {
              stroke = "var(--ice-blue)"
              fill = "rgba(75,156,211,0.12)"
            } else if (isHover && clickable) {
              stroke = "rgba(200,225,250,0.8)"
              fill = "rgba(120,170,220,0.12)"
            }

            return (
              <g
                key={r.id}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={
                  clickable
                    ? `${r.label}${isTarget ? " — destination, travel here" : ""}`
                    : undefined
                }
                onClick={() => handleRegionActivate(r)}
                onKeyDown={(e) => {
                  if (clickable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    handleRegionActivate(r)
                  }
                }}
                onMouseEnter={() => setHoverId(r.id)}
                onMouseLeave={() => setHoverId((h) => (h === r.id ? null : h))}
                style={{ cursor: clickable ? "pointer" : "default", outline: "none" }}
              >
                {/* Pulsing halo behind the active destination */}
                {isTargetAid && (
                  <rect
                    x={r.x - 6}
                    y={r.y - 6}
                    width={r.w + 12}
                    height={r.h + 12}
                    rx={8}
                    fill="none"
                    stroke="var(--color-amber)"
                    strokeWidth={2}
                    filter="url(#bpGlow)"
                  >
                    <animate attributeName="opacity" values="0.85;0.25;0.85" dur="1.4s" repeatCount="indefinite" />
                  </rect>
                )}

                {/* Region body */}
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={6}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isTarget || isActiveZone || isWrong ? 2.4 : 1.4}
                />

                {/* Hazard cross-hatch for the HAZ zone */}
                {r.zone === Zone.HAZ && (
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} fill="url(#bpHaz)" pointerEvents="none" />
                )}

                {/* Racking hatch lines (visual texture for zones) */}
                {r.kind === "zone" &&
                  [0.32, 0.5, 0.68].map((f) => (
                    <line
                      key={f}
                      x1={r.x + 12}
                      x2={r.x + r.w - 12}
                      y1={r.y + r.h * f}
                      y2={r.y + r.h * f}
                      stroke="rgba(200,225,250,0.16)"
                      strokeWidth={1}
                      pointerEvents="none"
                    />
                  ))}

                {/* Command Center service-counter detail */}
                {r.kind === "command" && (
                  <>
                    <rect
                      x={r.x + 18}
                      y={r.y + r.h - 30}
                      width={r.w - 36}
                      height={12}
                      rx={3}
                      fill="rgba(120,190,235,0.18)"
                      stroke="rgba(200,225,250,0.4)"
                      pointerEvents="none"
                    />
                    <circle cx={r.x + 30} cy={r.y + 30} r={7} fill="rgba(200,225,250,0.45)" pointerEvents="none" />
                  </>
                )}

                {/* Labels */}
                <text
                  x={cx}
                  y={cy - 6}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: r.kind === "command" ? 18 : 20,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    fill: isTargetAid ? "var(--color-amber)" : "#e8f4fd",
                    pointerEvents: "none",
                  }}
                >
                  {r.label}
                </text>
                <text
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-terminal)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    fill: "rgba(200,225,250,0.6)",
                    pointerEvents: "none",
                  }}
                >
                  {r.sub}
                </text>

                {/* Destination / current pick badge */}
                {isTargetAid && (
                  <g pointerEvents="none">
                    <rect
                      x={cx - 46}
                      y={r.y - 26}
                      width={92}
                      height={20}
                      rx={10}
                      fill="var(--color-amber)"
                    />
                    <text
                      x={cx}
                      y={r.y - 12}
                      textAnchor="middle"
                      style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", fill: "#0a2342" }}
                    >
                      ▶ GO HERE
                    </text>
                  </g>
                )}
                {isActiveZone && (
                  <g pointerEvents="none">
                    <rect
                      x={cx - 42}
                      y={r.y - 24}
                      width={84}
                      height={18}
                      rx={9}
                      fill="var(--ice-blue)"
                    />
                    <text
                      x={cx}
                      y={r.y - 11}
                      textAnchor="middle"
                      style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fill: "#0a2342" }}
                    >
                      ● YOU ARE HERE
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Status footer */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderTop: "1px solid rgba(120,170,220,0.22)", background: "rgba(8,28,52,0.6)" }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: toneColor,
            flexShrink: 0,
            boxShadow: `0 0 8px ${toneColor}`,
          }}
        />
        <span
          className="text-[11px]"
          style={{ fontFamily: "var(--font-terminal)", color: "#cfe6fb", lineHeight: 1.4 }}
        >
          {statusText}
        </span>
      </div>
    </div>
  )
}
