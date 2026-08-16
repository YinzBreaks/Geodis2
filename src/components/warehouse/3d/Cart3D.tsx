"use client"

import { useMemo } from "react"
import { Html } from "@react-three/drei"
import { DifficultyLevel, WorkflowStep, type SimulationSession, type ToteSlot } from "@/types/domain"
import type { AssetContext } from "@/types/warehouse"

interface Cart3DProps {
  session: SimulationSession
  difficulty: DifficultyLevel
  ctx: AssetContext
  effectiveHighlight: string | null
  onScan: (barcode: string) => void
  position?: [number, number, number]
}

export function Cart3D({ session, difficulty, ctx, effectiveHighlight, onScan, position = [0, 0, 0] }: Cart3DProps) {
  const isCartHighlighted = ctx.scannableAsset === "cart" && effectiveHighlight === session.cart.cartBarcode
  const isPlaceToteStep = session.currentStep === WorkflowStep.BC_PLACE_TOTE_IN_SLOT
  const placementTargetSlot = ctx.activeToteSlot ?? session.currentToteSlot

  // Precompute per-tote layout + visual state once per render.
  const toteData = useMemo(() => {
    const inPickPhase =
      session.currentStep.startsWith("PK_") || session.currentStep.startsWith("PS_")
    const activeSlot = ctx.activeToteSlot ?? session.currentToteSlot
    return session.cart.totes.map((tote, i) => {
      const slotNum = (i + 1) as ToteSlot
      const row = Math.floor(i / 3)
      const col = i % 3
      // Keep tote bins clearly above the top deck so they are visible and tappable.
      const tPosition: [number, number, number] = [col * 0.92 - 0.92, 1.22, row * 0.68 - 0.68]
      const isCurrent = slotNum === activeSlot
      const isLoaded =
        inPickPhase || tote.barcode.length > 0 || session.currentStep === "BC_PRESS_CTRL_E"
      const itemCount = tote.pickedItems.length
      // Real-cart visual pass: neutral gray totes with subtle state tint.
      const color = isLoaded ? (itemCount > 0 ? "#9ca3af" : "#cbd5e1") : "#6b7280"
      const innerColor = isLoaded ? "#4b5563" : "#374151"
      const rimColor = isLoaded ? "#d1d5db" : "#9ca3af"
      const canScan = ctx.scannableAsset === "tote" && isCurrent
      const highlighted = effectiveHighlight === tote.barcode
      const isPlacementTarget = isPlaceToteStep && slotNum === placementTargetSlot
      return {
        tote,
        slotNum,
        tPosition,
        isLoaded,
        itemCount,
        color,
        innerColor,
        rimColor,
        canScan,
        highlighted,
        isPlacementTarget,
      }
    })
  }, [
    session.cart.totes,
    session.currentStep,
    session.currentToteSlot,
    ctx.activeToteSlot,
    ctx.scannableAsset,
    effectiveHighlight,
    isPlaceToteStep,
    placementTargetSlot,
  ])

  return (
    <group position={position}>
      {/* Stainless-steel tray decks (3 levels) */}
      {[0.18, 0.6, 1.02].map((y) => (
        <mesh key={`deck-${y}`} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.05, 0.06, 2.05]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.62} roughness={0.34} />
        </mesh>
      ))}

      {/* Cart frame posts */}
      {[-1.45, 1.45].flatMap((x) =>
        [-0.95, 0.95].map((z) => (
          <mesh key={`post-${x}-${z}`} position={[x, 0.62, z]} castShadow>
            <boxGeometry args={[0.06, 1.22, 0.06]} />
            <meshStandardMaterial color="#9aa5b1" metalness={0.55} roughness={0.4} />
          </mesh>
        ))
      )}

      {/* Push handle bar */}
      <mesh position={[-1.45, 0.84, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.055, 0.055, 1.92]} />
        <meshStandardMaterial color="#aab4bf" metalness={0.58} roughness={0.36} />
      </mesh>

      {/* Corner bumpers */}
      {[-1.52, 1.52].flatMap((x) =>
        [-1.02, 1.02].map((z) => (
          <mesh key={`bumper-${x}-${z}`} position={[x, 0.02, z]} castShadow>
            <boxGeometry args={[0.14, 0.08, 0.14]} />
            <meshStandardMaterial color="#111827" roughness={0.85} />
          </mesh>
        ))
      )}

      {/* Cart Barcode Label — only show when cart scan is the active action. */}
      {ctx.scannableAsset === "cart" && (
        <Html position={[-1.46, 0.86, 0]} center transform scale={0.085} rotation={[0, -Math.PI / 2, 0]}>
          <div 
            className={`px-3 py-2 bg-white rounded cursor-pointer border-2 transition-all hover:scale-105 ${isCartHighlighted && difficulty === DifficultyLevel.BEGINNER ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse" : "border-slate-300"}`}
            onClick={() => onScan(session.cart.cartBarcode)}
          >
            <div className="text-[8px] text-slate-500 font-bold mb-0.5">CART LPN</div>
            <div className="font-mono text-sm text-black font-bold">{session.cart.cartBarcode}</div>
          </div>
        </Html>
      )}

      {/* Make the whole cart tappable during cart-scan steps. */}
      {ctx.scannableAsset === "cart" && (
        <>
          <mesh
            position={[0, 0.86, 0]}
            onClick={() => onScan(session.cart.cartBarcode)}
            onPointerOver={(e) => {
              e.stopPropagation()
              document.body.style.cursor = "pointer"
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default"
            }}
          >
            <boxGeometry args={[3.2, 1.45, 2.15]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          <Html position={[0, 1.16, 0]} center transform scale={0.09}>
            <div className="px-3 py-1.5 rounded bg-amber-400 text-black border-2 border-amber-100 font-mono text-[9px] font-bold shadow-lg whitespace-nowrap pointer-events-none">
              TAP CART TO SCAN
            </div>
          </Html>
        </>
      )}

      {/* Totes (3x3) */}
      {ctx.showTotes && (
        <>
          {toteData.map(({ tote, slotNum, tPosition, isLoaded, itemCount, color, innerColor, rimColor, canScan, highlighted, isPlacementTarget }) => (
            <group key={tote.toteId} position={tPosition}>
              {/* Tote shell: open bin (base + four walls + top rim). */}
              <mesh position={[0, -0.13, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.8, 0.06, 0.5]} />
                <meshStandardMaterial color={color} roughness={0.72} metalness={0.08} />
              </mesh>
              <mesh position={[0, 0.02, 0.23]} castShadow receiveShadow>
                <boxGeometry args={[0.8, 0.24, 0.04]} />
                <meshStandardMaterial color={color} roughness={0.72} metalness={0.08} />
              </mesh>
              <mesh position={[0, 0.02, -0.23]} castShadow receiveShadow>
                <boxGeometry args={[0.8, 0.24, 0.04]} />
                <meshStandardMaterial color={color} roughness={0.72} metalness={0.08} />
              </mesh>
              <mesh position={[0.38, 0.02, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.04, 0.24, 0.42]} />
                <meshStandardMaterial color={color} roughness={0.72} metalness={0.08} />
              </mesh>
              <mesh position={[-0.38, 0.02, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.04, 0.24, 0.42]} />
                <meshStandardMaterial color={color} roughness={0.72} metalness={0.08} />
              </mesh>

              {/* Top rim gives the bin shape a realistic tote silhouette. */}
              <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.84, 0.035, 0.54]} />
                <meshStandardMaterial color={rimColor} roughness={0.66} metalness={0.06} />
              </mesh>

              {/* Strong slot target frame for tote-scan and place-in-slot steps. */}
              {(highlighted || isPlacementTarget) && (
                <mesh position={[0, 0.01, 0]}>
                  <boxGeometry args={[0.9, 0.36, 0.6]} />
                  <meshBasicMaterial
                    wireframe
                    color={isPlacementTarget ? "#facc15" : "#f59e0b"}
                    transparent
                    opacity={0.95}
                  />
                </mesh>
              )}

              {/* Ghost tote shows where to place during BC_PLACE_TOTE_IN_SLOT. */}
              {isPlacementTarget && (
                <mesh position={[0, 0.22, 0]}>
                  <boxGeometry args={[0.78, 0.28, 0.48]} />
                  <meshStandardMaterial color="#d1d5db" transparent opacity={0.45} />
                </mesh>
              )}

              {/* Tote body is clickable so scan targets remain usable even if label perspective is awkward. */}
              <mesh
                position={[0, 0.02, 0]}
                onClick={() => canScan && onScan(tote.barcode)}
                onPointerOver={(e) => {
                  if (canScan) {
                    e.stopPropagation()
                    document.body.style.cursor = "pointer"
                  }
                }}
                onPointerOut={() => {
                  document.body.style.cursor = "default"
                }}
              >
                <boxGeometry args={[0.9, 0.44, 0.6]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              {/* Oversized top tap plate for the active tote on scan steps. */}
              {canScan && (
                <mesh
                  position={[0, 0.19, 0]}
                  onClick={() => onScan(tote.barcode)}
                  onPointerOver={(e) => {
                    e.stopPropagation()
                    document.body.style.cursor = "pointer"
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = "default"
                  }}
                >
                  <boxGeometry args={[0.86, 0.08, 0.56]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              )}

              {/* Inner cavity (fake depth) */}
              <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.7, 0.4]} />
                <meshStandardMaterial color={innerColor} />
              </mesh>

              {/* Items inside the tote */}
              {isLoaded &&
                itemCount > 0 &&
                Array.from({ length: Math.min(itemCount, 4) }).map((_, k) => (
                  <mesh
                    key={k}
                    position={[(k % 2) * 0.3 - 0.15, 0.2, Math.floor(k / 2) * 0.15 - 0.075]}
                    castShadow
                  >
                    <boxGeometry args={[0.2, 0.1, 0.15]} />
                    <meshStandardMaterial color={k % 2 === 0 ? "#ca8a04" : "#1d4ed8"} />
                  </mesh>
                ))}

              {/* Barcode label on the tote lid for tablet visibility. */}
              <Html position={[0, 0.18, 0]} center transform scale={0.085} rotation={[-Math.PI / 2, 0, 0]}>
                <div
                  className={`px-2 py-1 bg-white rounded flex items-center gap-1 cursor-pointer border transition-all hover:scale-105 shadow-sm ${
                    (highlighted || isPlacementTarget) && difficulty === DifficultyLevel.BEGINNER
                      ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse"
                      : "border-slate-300"
                  }`}
                  onClick={() => canScan && onScan(tote.barcode)}
                >
                  <div className="bg-slate-700 text-white font-mono text-[6px] px-1 rounded-sm">S{slotNum}</div>
                  {tote.barcode && (
                    <div className="font-mono text-[7px] text-black font-bold">{tote.barcode}</div>
                  )}
                </div>
              </Html>

              {isPlacementTarget && (
                <Html position={[0, 0.48, 0]} center transform scale={0.1}>
                  <div className="px-2 py-1 rounded bg-amber-400 text-black font-mono text-[9px] font-bold shadow-lg animate-pulse whitespace-nowrap">
                    PLACE IN S{slotNum}
                  </div>
                </Html>
              )}

            </group>
          ))}
        </>
      )}

      {isPlaceToteStep && (
        <>
          <group position={[-1.95, 1.03, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.78, 0.28, 0.48]} />
              <meshStandardMaterial color="#d1d5db" metalness={0.08} roughness={0.65} />
            </mesh>
            <Html position={[0, 0.26, 0]} center transform scale={0.095}>
              <div className="px-2 py-1 rounded bg-slate-900/90 text-amber-200 border border-amber-300/60 font-mono text-[8px] whitespace-nowrap">
                Move tote to slot {placementTargetSlot}
              </div>
            </Html>
          </group>
        </>
      )}
    </group>
  )
}
