"use client"

/**
 * /drill — Scan Pattern Training (Overhaul 6C)
 *
 * A standalone muscle-memory drill: barcodes are presented in rapid
 * succession with no warehouse context. 30-second rounds track scans/minute.
 * Pure client-side; no engine coupling. Reuses the synthesized scan sounds.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { generateBarcodeSVG } from "@/data/barcode-utils"
import { sounds } from "@/lib/audio"

const DRILL_SECONDS = 30

/** Generate a random tote-style barcode (T + 13 digits). */
function randomBarcode(): string {
  let digits = ""
  for (let i = 0; i < 13; i++) digits += Math.floor(Math.random() * 10)
  return `T${digits}`
}

type Phase = "idle" | "running" | "done"

export default function DrillPage() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [current, setCurrent] = useState<string>(randomBarcode())
  const [count, setCount] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(DRILL_SECONDS)
  const [best, setBest] = useState<number>(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    setCount(0)
    setSecondsLeft(DRILL_SECONDS)
    setCurrent(randomBarcode())
    setPhase("running")
  }, [])

  // Countdown timer.
  useEffect(() => {
    if (phase !== "running") return
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tickRef.current!)
          setPhase("done")
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [phase])

  // Update best when a round finishes.
  useEffect(() => {
    if (phase === "done") {
      setBest((b) => Math.max(b, count))
      sounds.sessionDone()
    }
  }, [phase, count])

  const handleScan = useCallback(() => {
    if (phase !== "running") return
    sounds.scanSuccess()
    setCount((c) => c + 1)
    setCurrent(randomBarcode())
  }, [phase])

  const scansPerMin = Math.round((count / DRILL_SECONDS) * 60)
  const svg = generateBarcodeSVG(current, 260, 80)
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 p-4"
      style={{ background: "var(--color-base)" }}
    >
      <div className="text-center">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem,4vw,2.25rem)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "0.04em",
          }}
        >
          SCAN PATTERN TRAINING
        </h1>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-secondary)", marginTop: 4 }}>
          30-second muscle-memory drill — scan as fast as you can.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-6" style={{ fontFamily: "var(--font-display)" }}>
        <Stat label="TIME" value={`${secondsLeft}s`} color="var(--ice-blue)" />
        <Stat label="SCANS" value={`${count}`} color="var(--amber-bright)" />
        <Stat label="SCANS/MIN" value={`${phase === "idle" ? 0 : scansPerMin}`} color="var(--success-bright)" />
        <Stat label="BEST" value={`${best}`} color="var(--color-text-primary)" />
      </div>

      {/* Drill surface */}
      {phase === "running" ? (
        <button
          type="button"
          onClick={handleScan}
          className="rounded-lg p-3"
          style={{ background: "var(--ice-white)", border: "2px solid var(--ice-blue)", cursor: "pointer" }}
          aria-label="Scan barcode"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={current} width={260} height={80} draggable={false} />
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          className="px-8 py-3 rounded-lg text-lg font-bold"
          style={{ background: "var(--ice-blue)", color: "var(--navy)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          {phase === "done" ? "GO AGAIN" : "START DRILL"}
        </button>
      )}

      {phase === "running" && (
        <p style={{ fontFamily: "var(--font-terminal)", fontSize: 12, color: "var(--concrete)" }}>
          Click the barcode to scan →
        </p>
      )}

      {phase === "done" && (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-secondary)" }}>
          You scanned <strong style={{ color: "var(--amber-bright)" }}>{count}</strong> barcodes
          {" "}({scansPerMin}/min).
        </p>
      )}

      <a
        href="/sim"
        style={{ fontFamily: "var(--font-terminal)", fontSize: 12, color: "var(--color-text-secondary)", textDecoration: "underline", opacity: 0.7 }}
      >
        ← Back to simulator
      </a>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span style={{ color, fontSize: 26, fontWeight: 700 }}>{value}</span>
      <span style={{ color: "var(--color-text-muted)", fontSize: 10, letterSpacing: "0.1em", marginTop: 4 }}>
        {label}
      </span>
    </div>
  )
}
