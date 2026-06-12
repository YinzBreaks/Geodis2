"use client"

import { useMemo } from "react"
import { Html, Instances, Instance } from "@react-three/drei"
import { DifficultyLevel, type SimulationSession, type ToteSlot } from "@/types/domain"
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

  // Precompute per-tote layout + visual state once per render. Tote bodies are
  // drawn with a single InstancedMesh (9 boxes → 1 draw call); the overlays
  // (cavity, items, barcode label) are rendered per tote in a sibling pass.
  const toteData = useMemo(() => {
    const inPickPhase =
      session.currentStep.startsWith("PK_") || session.currentStep.startsWith("PS_")
    const activeSlot = ctx.activeToteSlot ?? session.currentToteSlot
    return session.cart.totes.map((tote, i) => {
      const slotNum = (i + 1) as ToteSlot
      const row = Math.floor(i / 3)
      const col = i % 3
      const tPosition: [number, number, number] = [col * 0.9 - 0.9, 0.6, row * 0.6 - 0.6]
      const isCurrent = slotNum === activeSlot
      const isLoaded =
        inPickPhase || tote.barcode.length > 0 || session.currentStep === "BC_PRESS_CTRL_E"
      const itemCount = tote.pickedItems.length
      // Empty tote is grey, loaded is blue, loaded with items is green
      const color = isLoaded ? (itemCount > 0 ? "#10b981" : "#2563eb") : "#475569"
      const canScan = ctx.scannableAsset === "tote" && isCurrent
      const highlighted = effectiveHighlight === tote.barcode
      return { tote, slotNum, tPosition, isLoaded, itemCount, color, canScan, highlighted }
    })
  }, [
    session.cart.totes,
    session.currentStep,
    session.currentToteSlot,
    ctx.activeToteSlot,
    ctx.scannableAsset,
    effectiveHighlight,
  ])

  return (
    <group position={position}>
      {/* Cart Frame Base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.1, 2]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      
      {/* Cart Handles */}
      <mesh position={[-1.4, 1, 0.8]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.2]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[-1.4, 1, -0.8]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.2]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[-1.4, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Cart Barcode Label */}
      <Html position={[-1.4, 1.4, 0]} center transform scale={0.085} rotation={[0, -Math.PI / 2, 0]}>
        <div 
          className={`px-3 py-2 bg-white rounded cursor-pointer border-2 transition-all hover:scale-105 ${isCartHighlighted && difficulty === DifficultyLevel.BEGINNER ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse" : "border-slate-300"}`}
          onClick={() => ctx.scannableAsset === "cart" && onScan(session.cart.cartBarcode)}
        >
          <div className="text-[8px] text-slate-500 font-bold mb-0.5">CART LPN</div>
          <div className="font-mono text-sm text-black font-bold">{session.cart.cartBarcode}</div>
        </div>
      </Html>

      {/* Totes (3x3) — bodies batched into one InstancedMesh for fewer draw calls */}
      {ctx.showTotes && (
        <>
          <Instances limit={9} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.3, 0.5]} />
            <meshStandardMaterial roughness={0.6} />
            {toteData.map(({ tote, tPosition, color }) => (
              <Instance key={tote.toteId} position={tPosition} color={color} />
            ))}
          </Instances>

          {/* Per-tote overlays: inner cavity, items, and the barcode label */}
          {toteData.map(({ tote, slotNum, tPosition, isLoaded, itemCount, canScan, highlighted }) => (
            <group key={tote.toteId} position={tPosition}>
              {/* Tote body is clickable so scan targets remain usable even if label perspective is awkward. */}
              <mesh
                position={[0, 0.01, 0]}
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
                <boxGeometry args={[0.84, 0.32, 0.54]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              {/* Inner cavity (fake depth) */}
              <mesh position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.7, 0.4]} />
                <meshStandardMaterial color="#1e293b" />
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
                    <meshStandardMaterial color={k % 2 === 0 ? "#eab308" : "#3b82f6"} />
                  </mesh>
                ))}

              {/* Barcode label (front face) */}
              <Html position={[0, 0, 0.26]} center transform scale={0.07}>
                <div
                  className={`px-1.5 py-1 bg-white rounded flex items-center gap-1 cursor-pointer border transition-all hover:scale-105 ${
                    highlighted && difficulty === DifficultyLevel.BEGINNER
                      ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse"
                      : "border-slate-300"
                  }`}
                  onClick={() => canScan && onScan(tote.barcode)}
                >
                  <div className="bg-slate-700 text-white font-mono text-[6px] px-1 rounded-sm">S{slotNum}</div>
                  {tote.barcode && (
                    <div className="font-mono text-[7px] text-black font-bold">{tote.barcode.slice(-4)}</div>
                  )}
                </div>
              </Html>
            </group>
          ))}
        </>
      )}
    </group>
  )
}
