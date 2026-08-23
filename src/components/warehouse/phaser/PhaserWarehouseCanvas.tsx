"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSimulation } from "@/hooks/useSimulation"
import { DifficultyLevel, type SimulationSession } from "@/types/domain"
import type { PhaserWarehouseScene, SceneBridgeCallbacks } from "./PhaserWarehouseScene"

interface PhaserWarehouseCanvasProps {
  difficulty?: DifficultyLevel
  onScanOverride?: (barcode: string) => void
  onConfirmOverride?: () => void
  className?: string
}

export function PhaserWarehouseCanvas({
  difficulty = DifficultyLevel.BEGINNER,
  onScanOverride,
  onConfirmOverride,
  className = "",
}: PhaserWarehouseCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<PhaserWarehouseScene | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [activeViewLabel, setActiveViewLabel] = useState<string>("Overview")

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
        onScan: (barcode) => handleScan(barcode),
        onConfirm: () => handleConfirm(),
        onCameraChange: (zoom, target) => {
          if (zoom > 1.2) {
            setActiveViewLabel(`Zoom: ${target}`)
          } else {
            setActiveViewLabel("Overview")
          }
        },
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

  // Camera toolbar triggers
  const handleZoomShelf = () => {
    const pick = session?.pickQueue[session?.currentPickIndex]
    const loc = pick?.location.displayLabel || "316-001-A1"
    sceneRef.current?.zoomToShelf(loc, 700)
  }

  const handleResetCamera = () => {
    sceneRef.current?.resetToOverview(600)
  }

  const handleToggleConveyor = () => {
    sceneRef.current?.transitionToConveyor(800)
  }

  const handleToggleAisle = () => {
    sceneRef.current?.transitionToAisle(800)
  }

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

      {/* Floating Canvas Camera HUD (isolated at bottom-left) */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 shadow-2xl pointer-events-auto">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
        <span className="text-amber-400 font-bold text-xs font-mono">2.5D:</span>
        <span className="text-slate-300 font-mono text-xs mr-2">{activeViewLabel}</span>

        <button
          type="button"
          onClick={handleResetCamera}
          className="min-h-[36px] px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-amber-600 rounded-lg border border-slate-600 transition-colors text-xs font-bold text-slate-100"
          title="Reset Camera Overview"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleZoomShelf}
          className="min-h-[36px] px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-amber-600 rounded-lg border border-slate-600 transition-colors text-xs font-bold text-slate-100"
          title="Zoom to Pick Shelf"
        >
          Shelf
        </button>
        <button
          type="button"
          onClick={handleToggleConveyor}
          className="min-h-[36px] px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-amber-600 rounded-lg border border-slate-600 transition-colors text-xs font-bold text-slate-100"
          title="View Conveyor Area"
        >
          Conveyor
        </button>
        <button
          type="button"
          onClick={handleToggleAisle}
          className="min-h-[36px] px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-amber-600 rounded-lg border border-slate-600 transition-colors text-xs font-bold text-slate-100"
          title="View Aisle Area"
        >
          Aisle
        </button>
      </div>

      {/* Phaser Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full z-0 bg-gray-900 flex items-center justify-center"
      />
    </div>
  )
}
export default PhaserWarehouseCanvas
