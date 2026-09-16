"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Html } from "@react-three/drei"
import { Suspense, useState } from "react"
import { DifficultyLevel, type SimulationSession } from "@/types/domain"
import { getAssetContext } from "@/lib/assetContext"
import { assetLabel, t, type AppLanguage } from "@/lib/i18n"

// We will implement these components next
import { Shelf3D } from "./Shelf3D"
import { Cart3D } from "./Cart3D"

interface WarehouseScene3DProps {
  session: SimulationSession
  difficulty: DifficultyLevel
  onScan: (barcode: string) => void
  onConfirm: () => void
  language: AppLanguage
}

export function WarehouseScene3D({ session, difficulty, onScan, onConfirm, language }: WarehouseScene3DProps) {
  const ctx = getAssetContext(session.currentStep, session)
  const effectiveHighlight = difficulty === DifficultyLevel.ADVANCED ? null : ctx.highlightedBarcode
  const isCartFocusedStep = ctx.showCart && !ctx.showShelf
  const cameraPosition: [number, number, number] = isCartFocusedStep ? [0, 3.7, 6.7] : [0, 2.8, 4.6]
  const cartY = isCartFocusedStep ? -0.28 : 0

  // Disable camera orbit while an item is being dragged (avoids pointer-event conflict).
  const [dragging, setDragging] = useState(false)

  return (
    <div className="w-full h-full relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      <Canvas shadows frameloop="always" camera={{ position: cameraPosition, fov: isCartFocusedStep ? 42 : 44 }}>
        <color attach="background" args={["#1f2937"]} />
        <fog attach="fog" args={["#1f2937", 10, 36]} />
        <hemisphereLight args={["#f8fafc", "#64748b", 0.8]} />
        <ambientLight intensity={0.28} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.35}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={30}
        />
        <pointLight position={[0, 6.5, 0]} intensity={0.55} color="#f8fafc" />
        <pointLight position={[-8, 6.2, -2]} intensity={0.45} color="#e2e8f0" />
        <pointLight position={[8, 6.2, -2]} intensity={0.45} color="#e2e8f0" />
        
        <Suspense fallback={<Html center><div className="text-white">{t(language, "warehouse.loading_3d")}</div></Html>}>
          {/* Concrete floor with painted traffic lanes inspired by GEODIS floor markings. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#7c8796" roughness={0.86} metalness={0.08} />
          </mesh>

          <FloorLaneLines />
          <BackgroundConveyors language={language} />
          <SupportColumns />

          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={20} blur={2} far={4} />

          <OrbitControls 
            makeDefault
            enabled={!dragging}
            enablePan={false}
            enableZoom={false}
            minPolarAngle={0.95}
            maxPolarAngle={0.95}
            minAzimuthAngle={0}
            maxAzimuthAngle={0}
          />

          <group position={[0, 0, 0]}>
            {ctx.showShelf && (
              <Shelf3D 
                session={session}
                difficulty={difficulty}
                ctx={ctx}
                effectiveHighlight={effectiveHighlight}
                onScan={onScan}
                onConfirm={onConfirm}
                language={language}
                setDragging={setDragging}
              />
            )}

            {ctx.showCart && (
              <Cart3D 
                session={session}
                difficulty={difficulty}
                ctx={ctx}
                effectiveHighlight={effectiveHighlight}
                onScan={onScan}
                position={ctx.showShelf ? [0, 0, 3] : [0, cartY, 0]} // Move cart back if shelf is shown
              />
            )}
          </group>
        </Suspense>
      </Canvas>

      {/* HTML Overlays for UI */}
      <div className="absolute top-4 left-4 pointer-events-none text-white font-mono text-xs">
        <div className="bg-slate-800/80 px-2 py-1 rounded border border-slate-600">
          {t(language, "warehouse.zone_badge", { zone: session.cart.zone })}
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-slate-800/80 px-4 py-2 rounded-full border border-slate-600 text-white font-mono text-xs shadow-lg backdrop-blur">
          {difficulty === DifficultyLevel.BEGINNER && ctx.scannableAsset
            ? t(language, "warehouse.footer.scan_highlighted", {
                asset: assetLabel(language, ctx.scannableAsset),
              })
            : t(language, "warehouse.fixed_camera_hint")}
        </div>
      </div>
    </div>
  )
}

function FloorLaneLines() {
  return (
    <group position={[0, 0.002, 0]}>
      {[-6.4, -3.2, 0, 3.2, 6.4].map((x) => (
        <mesh key={`y-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, 1.8]}>
          <planeGeometry args={[0.08, 8.5]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      ))}
      {[-1.6, 1.6, 4.8].map((z) => (
        <mesh key={`x-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z]}>
          <planeGeometry args={[14, 0.08]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      ))}
      {[-5, -2.5, 0, 2.5, 5].map((x) => (
        <mesh key={`w-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, -3.4]}>
          <planeGeometry args={[0.06, 3.2]} />
          <meshBasicMaterial color="#e5e7eb" opacity={0.9} transparent />
        </mesh>
      ))}
    </group>
  )
}

function BackgroundConveyors({ language }: { language: AppLanguage }) {
  return (
    <group position={[0, 0, -6.8]}>
      {[0, 1.15, 2.3].map((y) => (
        <mesh key={`conv-${y}`} position={[0, 0.85 + y, 0]} receiveShadow>
          <boxGeometry args={[16, 0.12, 0.55]} />
          <meshStandardMaterial color="#1d4ed8" metalness={0.25} roughness={0.5} />
        </mesh>
      ))}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={`leg-${i}`} position={[-7.2 + i * 1.2, 0.43, 0]} castShadow>
          <boxGeometry args={[0.1, 0.86, 0.1]} />
          <meshStandardMaterial color="#1e293b" metalness={0.25} roughness={0.52} />
        </mesh>
      ))}
      <Html position={[0, 2.8, 0.18]} center transform scale={0.2}>
        <div className="px-4 py-1.5 rounded border-2 border-slate-300 bg-white text-slate-900 font-bold tracking-wide">
          {t(language, "warehouse.bulk_zone")}
        </div>
      </Html>
    </group>
  )
}

function SupportColumns() {
  return (
    <group>
      {[-7.5, -3.5, 0.5, 4.5, 8.5].map((x, idx) => (
        <group key={`col-${idx}`} position={[x, 0, -4.3]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[0.34, 3.2, 0.34]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.12} roughness={0.72} />
          </mesh>
          {/* GEODIS Blue (#004A99) Collision Bollard Wrap with Safety Accent */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.38, 0.9, 0.38]} />
            <meshStandardMaterial color="#004a99" metalness={0.15} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[0.385, 0.08, 0.385]} />
            <meshStandardMaterial color="#facc15" metalness={0.1} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
