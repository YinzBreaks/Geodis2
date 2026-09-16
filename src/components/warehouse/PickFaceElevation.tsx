"use client"

import React from "react"
import type { WarehouseLocation, WarehouseItem, DifficultyLevel } from "@/types/domain"
import { BarcodeLabel } from "./assets/BarcodeLabel"
import { getProductAsset, getDefectAsset } from "@/lib/assetRegistry"

export interface PickFaceElevationProps {
  location?: WarehouseLocation
  item?: WarehouseItem
  scannable?: boolean
  highlighted?: boolean
  difficulty?: DifficultyLevel
  defectType?: "SCRATCHED_BARCODE" | "CRUSHED_CARTON" | "HAZMAT_SPILL"
  onScan?: (barcode: string) => void
}

interface TierConfig {
  level: "D" | "C" | "B" | "A"
  label: string
  subtitle: string
  heightMeters: string
  deckType: "wire" | "wire" | "steel" | "pallet"
  color: string
  accentBorder: string
}

const TIERS: TierConfig[] = [
  {
    level: "D",
    label: "LEVEL D (TOP REACH)",
    subtitle: "Overhead Safety Zone — Ladder/Step Assist",
    heightMeters: "2.2 m",
    deckType: "wire",
    color: "bg-amber-950/40",
    accentBorder: "border-amber-500/50",
  },
  {
    level: "C",
    label: "LEVEL C (CHEST HEIGHT)",
    subtitle: "High-Visibility Wire Decking",
    heightMeters: "1.6 m",
    deckType: "wire",
    color: "bg-slate-900/60",
    accentBorder: "border-slate-600/50",
  },
  {
    level: "B",
    label: "LEVEL B (ERGONOMIC GOLDEN ZONE)",
    subtitle: "Waist-to-Chest Prime Velocity Slot",
    heightMeters: "1.1 m",
    deckType: "steel",
    color: "bg-emerald-950/30",
    accentBorder: "border-emerald-500/40",
  },
  {
    level: "A",
    label: "LEVEL A (FLOOR LEVEL)",
    subtitle: "Heavy Pallet Base Decking",
    heightMeters: "0.3 m",
    deckType: "pallet",
    color: "bg-slate-900/80",
    accentBorder: "border-slate-700/50",
  },
]

export function PickFaceElevation({
  location,
  item,
  scannable = false,
  highlighted = true,
  difficulty = "BEGINNER" as DifficultyLevel,
  defectType,
  onScan,
}: PickFaceElevationProps) {
  const currentLevel = (location?.level?.toUpperCase() ?? "B") as "D" | "C" | "B" | "A"

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl flex flex-col font-mono text-xs select-none">
      {/* Rack Header with Bay Signage */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
            BAY {location?.bay ?? "01"}
          </span>
          <span className="text-slate-300 font-bold tracking-wide">
            AISLE {location?.aisle ?? "316"} PICK FACE ELEVATION
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          ALOC:{" "}
          <strong className="text-amber-400 font-bold">
            {location?.displayLabel ?? "316-01-B-01"}
          </strong>
        </div>
      </div>

      {/* 4-Tier Vertical Rack Frame */}
      <div className="flex flex-col gap-2.5 my-3 relative">
        {/* Steel Uprights (Visual Framing) */}
        <div className="absolute -left-1 top-0 bottom-0 w-2 bg-blue-900/60 rounded border border-blue-600/40" />
        <div className="absolute -right-1 top-0 bottom-0 w-2 bg-blue-900/60 rounded border border-blue-600/40" />

        {TIERS.map((tier) => {
          const isTargetTier = tier.level === currentLevel
          return (
            <div
              key={tier.level}
              className={`relative rounded-lg p-2.5 transition-all duration-200 border ${
                isTargetTier
                  ? `bg-slate-900/90 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-950/50`
                  : `${tier.color} ${tier.accentBorder} opacity-60`
              }`}
            >
              {/* Wire Decking Pattern for Top Tiers */}
              {tier.deckType === "wire" && (
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none opacity-10"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 8px), repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 8px)",
                  }}
                />
              )}

              {/* Tier Header Line */}
              <div className="flex justify-between items-center mb-1.5 relative z-10">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      isTargetTier
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {tier.level}
                  </span>
                  <span
                    className={`text-[11px] font-bold tracking-tight ${
                      isTargetTier ? "text-amber-300" : "text-slate-300"
                    }`}
                  >
                    {tier.label}
                  </span>
                  {tier.level === "D" && (
                    <span className="hidden sm:inline-block px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] rounded font-bold">
                      ⚠ TOP TIER SAFETY
                    </span>
                  )}
                  {tier.level === "B" && (
                    <span className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] rounded font-bold">
                      ★ GOLDEN ZONE
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  <span>{tier.heightMeters}</span>
                  {isTargetTier && location?.checkDigit && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-amber-500 text-amber-300 font-mono font-bold text-[11px]">
                      CD: [{location.checkDigit}]
                    </span>
                  )}
                </div>
              </div>

              {/* Product Slot & Shelf Contents */}
              <div className="flex items-center justify-between bg-black/40 rounded p-2 border border-slate-800/80 relative z-10">
                <div className="flex items-center gap-3">
                  {isTargetTier && item ? (
                    <>
                      {/* Visual Product Thumbnail & Defect Indicator */}
                      <div className="relative w-12 h-12 rounded bg-slate-950/90 border border-slate-700 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
                        <img
                          src={getProductAsset(item.sku)}
                          alt={item.description}
                          className="w-full h-full object-contain"
                        />
                        {defectType && (
                          <div className="absolute inset-0 bg-red-950/60 border border-red-500 rounded flex items-center justify-center backdrop-blur-[0.5px]">
                            <img
                              src={getDefectAsset(defectType)?.path}
                              alt={defectType}
                              className="w-8 h-8 object-contain drop-shadow"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-white font-bold text-[11px] truncate max-w-[200px]">
                          {item.description}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          SKU: <span className="text-zinc-200 font-mono">{item.sku}</span> | Last 4:{" "}
                          <span className="text-amber-300 font-bold font-mono">
                            {item.lastFourDigits}
                          </span>
                        </span>

                        {/* Day 4 Defect Visual Overlays */}
                        {defectType && (
                          <div className="mt-1 px-1.5 py-0.5 bg-rose-950/80 border border-rose-500/60 rounded text-[9px] text-rose-300 font-bold flex items-center gap-1">
                            <span>⚠ {getDefectAsset(defectType)?.label}</span>
                            <span className="text-amber-300 ml-1">{getDefectAsset(defectType)?.actionHint}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/equipment/empty_bin_slot.svg"
                        alt="Empty Slot"
                        className="w-7 h-7 opacity-20 object-contain"
                      />
                      <span className="text-slate-500 text-[10px] italic">
                        {tier.subtitle}
                      </span>
                    </div>
                  )}
                </div>

                {/* Scannable Barcode if active target */}
                {isTargetTier && (
                  <div className="flex items-center gap-2">
                    {location && (
                      <BarcodeLabel
                        value={location.barcode ?? location.displayLabel}
                        scannable={scannable}
                        difficulty={difficulty}
                        onScan={(val) => onScan?.(val)}
                      />
                    )}
                    {item && (
                      <BarcodeLabel
                        value={item.upcBarcode}
                        scannable={scannable}
                        difficulty={difficulty}
                        onScan={(val) => onScan?.(val)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Safety Signage Footer */}
      <div className="mt-1 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Always confirm Check Digit before pulling inventory
        </span>
        <span className="text-slate-500">BBWD-WI-030 §5.2.7</span>
      </div>
    </div>
  )
}
