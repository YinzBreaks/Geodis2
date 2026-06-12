"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Html } from "@react-three/drei"
import { Suspense, useState } from "react"
import { WorkflowStep, DifficultyLevel, type SimulationSession, type ToteSlot } from "@/types/domain"
import { getAssetContext } from "@/lib/assetContext"

// We will implement these components next
import { Shelf3D } from "./Shelf3D"
import { Cart3D } from "./Cart3D"

interface WarehouseScene3DProps {
  session: SimulationSession
  difficulty: DifficultyLevel
  onScan: (barcode: string) => void
  onConfirm: () => void
}

export function WarehouseScene3D({ session, difficulty, onScan, onConfirm }: WarehouseScene3DProps) {
  const step = session.currentStep
  const ctx = getAssetContext(step, session)
  const effectiveHighlight = difficulty === DifficultyLevel.ADVANCED ? null : ctx.highlightedBarcode

  // Disable camera orbit while an item is being dragged (avoids pointer-event conflict).
  const [dragging, setDragging] = useState(false)

  return (
    <div className="w-full h-full relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      <Canvas shadows frameloop="demand" camera={{ position: [0, 4, 8], fov: 45 }}>
        <color attach="background" args={["#0f172a"]} />
        <hemisphereLight args={["#bcd4ff", "#2a2a2a", 0.6]} />
        <ambientLight intensity={0.15} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={30}
        />
        
        <Suspense fallback={<Html center><div className="text-white">Loading 3D Scene...</div></Html>}>
          {/* Concrete Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#334155" roughness={0.8} />
          </mesh>

          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={20} blur={2} far={4} />

          <OrbitControls 
            makeDefault
            enabled={!dragging}
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2 - 0.05} 
            minDistance={2} 
            maxDistance={20} 
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
                position={ctx.showShelf ? [0, 0, 3] : [0, 0, 0]} // Move cart back if shelf is shown
              />
            )}
          </group>
        </Suspense>
      </Canvas>

      {/* HTML Overlays for UI */}
      <div className="absolute top-4 left-4 pointer-events-none text-white font-mono text-xs">
        <div className="bg-slate-800/80 px-2 py-1 rounded border border-slate-600">
          Zone {session.cart.zone}
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-slate-800/80 px-4 py-2 rounded-full border border-slate-600 text-white font-mono text-xs shadow-lg backdrop-blur">
          {difficulty === DifficultyLevel.BEGINNER && ctx.scannableAsset
            ? `Scan the highlighted ${ctx.scannableAsset} to continue`
            : "Use mouse to rotate and zoom"}
        </div>
      </div>
    </div>
  )
}
