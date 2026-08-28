"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSimulation } from "@/hooks/useSimulation"
import { DifficultyLevel, type SimulationSession } from "@/types/domain"
import type { PhaserWarehouseScene, SceneBridgeCallbacks } from "./PhaserWarehouseScene"

interface PhaserWarehouseCanvasProps {
  difficulty?: DifficultyLevel
  /** User-level reduced-motion preference (combined with the OS media query). */
  reducedMotion?: boolean
  onScanOverride?: (barcode: string) => void
  onConfirmOverride?: () => void
  className?: string
}

export function PhaserWarehouseCanvas({
  difficulty = DifficultyLevel.BEGINNER,
  reducedMotion = false,
  onScanOverride,
  onConfirmOverride,
  className = "",
}: PhaserWarehouseCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<PhaserWarehouseScene | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [osReducedMotion, setOsReducedMotion] = useState(false)

  // Zustand simulation hooks
  const session = useSimulation((s) => s.session)
  const processInput = useSimulation((s) => s.processInput)
  const lastActionResult = useSimulation((s) => s.lastActionResult)

  // Stable action callbacks
  const handleScan = useCallback(
    (barcode: string) => {
      if (onScanOverride) {
        onScanOverride(barcode)
      } else {
        processInput({ type: "SCAN", value: barcode, source: "click" })
      }
    },
    [onScanOverride, processInput]
  )

  const handleConfirm = useCallback(() => {
    if (onConfirmOverride) {
      onConfirmOverride()
    } else {
      processInput({ type: "CONFIRM", value: "", source: "click" })
    }
  }, [onConfirmOverride, processInput])

  // The scene bridge is registered once at game creation; route it through
  // refs so late prop changes (e.g. a new onScanOverride) are never stale.
  const handleScanRef = useRef(handleScan)
  const handleConfirmRef = useRef(handleConfirm)
  useEffect(() => {
    handleScanRef.current = handleScan
    handleConfirmRef.current = handleConfirm
  }, [handleScan, handleConfirm])

  // Track the OS-level prefers-reduced-motion setting.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    setOsReducedMotion(media.matches)
    const onChange = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  // Initialize Phaser
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || gameRef.current) {
      return
    }

    let isMounted = true

    const initPhaser = async () => {
      const Phaser = await import("phaser")
      const { PhaserWarehouseScene } = await import("./PhaserWarehouseScene")

      if (!isMounted || !containerRef.current) return

      const sceneInstance = new PhaserWarehouseScene()
      sceneRef.current = sceneInstance

      const bridgeCallbacks: SceneBridgeCallbacks = {
        onScan: (barcode) => handleScanRef.current(barcode),
        onConfirm: () => handleConfirmRef.current(),
      }

      sceneInstance.setBridgeCallbacks(bridgeCallbacks)

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: "100%",
        height: "100%",
        backgroundColor: "#090d16",
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [sceneInstance],
        render: {
          antialias: true,
          pixelArt: false,
          powerPreference: "high-performance",
        },
      }

      const game = new Phaser.Game(config)
      gameRef.current = game

      game.events.once("ready", () => {
        if (isMounted) {
          setIsReady(true)
          if (session) {
            sceneInstance.updateSimulationState(session, difficulty)
          }
        }
      })
    }

    initPhaser()

    return () => {
      isMounted = false
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
        sceneRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize Zustand session state to Phaser scene
  useEffect(() => {
    if (sceneRef.current && session) {
      sceneRef.current.updateSimulationState(session, difficulty)
    }
  }, [session, difficulty])

  // Propagate reduced-motion (user toggle OR OS setting) into the scene.
  const effectiveReducedMotion = reducedMotion || osReducedMotion
  useEffect(() => {
    if (isReady && sceneRef.current) {
      sceneRef.current.setReducedMotion(effectiveReducedMotion)
    }
  }, [isReady, effectiveReducedMotion])

  return (
    <div
      id="phaser-simulation-viewport"
      className={`absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden ${className}`}
    >
      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm text-amber-400">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="font-mono text-xs uppercase tracking-widest text-slate-300">
            Initializing GEODIS 2.5D Canvas...
          </span>
        </div>
      )}

      {/* Phaser Canvas Container. Announced as a single image to assistive
          tech — screen-reader users act through the RF Device panel and the
          live-region announcements in PhaserSimulationShell instead. */}
      <div
        ref={containerRef}
        role="img"
        aria-label="2.5D warehouse view: pick cart with nine tote slots, shelf aisle, and conveyor line. All actions can be performed from the RF Device panel."
        className="absolute inset-0 w-full h-full z-0 bg-gray-900 flex items-center justify-center"
      />
    </div>
  )
}
export default PhaserWarehouseCanvas
