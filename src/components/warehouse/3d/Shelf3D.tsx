"use client"

import { useMemo, useState } from "react"
import { Html, DragControls } from "@react-three/drei"
import { DifficultyLevel, WorkflowStep, type SimulationSession } from "@/types/domain"
import type { AssetContext } from "@/types/warehouse"
import { getDecoyItems } from "@/hooks/useSimulation"
import { parseShelfLevel } from "../assets/ShelfLocation"

interface Shelf3DProps {
  session: SimulationSession
  difficulty: DifficultyLevel
  ctx: AssetContext
  effectiveHighlight: string | null
  onScan: (barcode: string) => void
  onConfirm: () => void
  /** Toggle parent OrbitControls off while an item is being dragged. */
  setDragging?: (dragging: boolean) => void
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export function Shelf3D({ session, difficulty, ctx, effectiveHighlight, onScan, onConfirm, setDragging }: Shelf3DProps) {
  const pick = session.pickQueue[session.currentPickIndex]
  const decoys = useMemo(() => getDecoyItems(session, difficulty), [session.currentPickIndex, difficulty])

  const shelfItems = useMemo(() => {
    if (!pick) return []
    const items = [
      { item: pick.item, isCorrect: true },
      ...decoys.map((d) => ({ item: d, isCorrect: false })),
    ]
    const seed = session.currentPickIndex
    return items.sort((a, b) => hashCode(a.item.itemId + seed) - hashCode(b.item.itemId + seed))
  }, [pick, decoys, session.currentPickIndex])

  // Track dragged state — declared before any early return to satisfy the Rules of Hooks.
  const [dragPosition, setDragPosition] = useState<[number, number, number] | null>(null)

  if (!pick) return null

  const level = parseShelfLevel(pick.location.displayLabel)
  // Maps level to Y height in 3D
  const shelfY = level === "C" ? 2.5 : level === "B" ? 1.5 : 0.5
  const isLocHighlighted = effectiveHighlight === pick.location.displayLabel
  const isPlaceStep = session.currentStep === WorkflowStep.PK_PLACE_IN_TOTE

  return (
    <group position={[0, 0, -1]}>
      {/* Basic Rack Frame */}
      <mesh position={[-2, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 3, 0.4]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <mesh position={[2, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 3, 0.4]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>

      {/* Shelves (C, B, A) */}
      {[2.5, 1.5, 0.5].map((y, i) => (
        <mesh key={i} position={[0, y - 0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.1, 0.8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}

      {/* Location Label on the Shelf */}
      <Html position={[0, shelfY - 0.1, 0.4]} center transform>
        <div 
          className={`px-2 py-1 rounded cursor-pointer transition-transform hover:scale-105 ${isLocHighlighted && difficulty === DifficultyLevel.BEGINNER ? "bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse" : "bg-slate-800 text-white border border-slate-600"}`}
          onClick={() => ctx.scannableAsset === "location" && onScan(pick.location.displayLabel)}
        >
          <div className="text-[8px] opacity-70">LOCATION</div>
          <div className="font-mono text-xs font-bold">{pick.location.displayLabel}</div>
        </div>
      </Html>

      {/* Render Items on the correct shelf */}
      {shelfItems.map((sItem, index) => {
        const isItemHighlighted = sItem.isCorrect && effectiveHighlight === sItem.item.upcBarcode
        const xPos = (index - 1) * 1.2 // -1.2, 0, 1.2 for 3 items
        const isDraggable = isPlaceStep && sItem.isCorrect

        const boxContent = (
          <group position={dragPosition && isDraggable ? undefined : [xPos, shelfY + 0.15, 0]}>
            {/* 3D Box */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.6, 0.5, 0.6]} />
              <meshStandardMaterial color={isDraggable ? "#facc15" : "#eab308"} />
            </mesh>

            {/* Scannable Item Label UI (Overlay) */}
            {ctx.showItem && ctx.scannableAsset === "item" && (
              <Html position={[0, 0, 0.31]} center transform distanceFactor={5}>
                <div 
                  className={`w-24 bg-white rounded p-1 cursor-pointer border-2 transition-all hover:scale-105 ${isItemHighlighted && difficulty === DifficultyLevel.BEGINNER ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse" : "border-slate-300"}`}
                  onClick={() => onScan(sItem.item.upcBarcode)}
                  style={{ userSelect: "none" }}
                >
                  <div className="text-[6px] text-slate-500 truncate leading-tight">{sItem.item.description}</div>
                  <div className="text-center font-mono font-bold text-[8px] text-black mt-1 bg-slate-100 rounded">
                    {sItem.item.upcBarcode}
                  </div>
                </div>
              </Html>
            )}
            
            {/* Drag Hint */}
            {isDraggable && !dragPosition && (
              <Html position={[0, 0.5, 0]} center transform distanceFactor={5}>
                <div className="bg-blue-600 text-white font-bold text-[8px] px-2 py-1 rounded shadow-lg animate-bounce pointer-events-none whitespace-nowrap">
                  DRAG TO TOTE
                </div>
              </Html>
            )}
          </group>
        )
        
        return (
          <group key={sItem.item.itemId}>
            {isDraggable ? (
              <DragControls 
                axisLock="y" 
                onDragStart={() => {
                  // Disable camera orbit so dragging the item doesn't rotate the view
                  setDragging?.(true)
                  setDragPosition([xPos, shelfY + 0.15, 0])
                }}
                onDragEnd={() => {
                  // Re-enable camera orbit, then confirm the place step on drop
                  setDragging?.(false)
                  onConfirm()
                }}
              >
                {boxContent}
              </DragControls>
            ) : boxContent}
          </group>
        )
      })}
    </group>
  )
}
