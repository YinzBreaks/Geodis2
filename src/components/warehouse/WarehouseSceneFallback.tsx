"use client"

import Image from "next/image"
import { WorkflowStep, type SimulationSession } from "@/types/domain"
import type { AssetContext } from "@/types/warehouse"
import { t, type AppLanguage } from "@/lib/i18n"

interface WarehouseSceneFallbackProps {
  session: SimulationSession
  ctx: AssetContext
  onScan: (barcode: string) => void
  onConfirm: () => void
  language: AppLanguage
}

/** CSS fallback for Cart/Tote/Shelf interactions when WebGL is unavailable. */
export function WarehouseSceneFallback({
  session,
  ctx,
  onScan,
  onConfirm,
  language,
}: WarehouseSceneFallbackProps) {
  const pick = session.pickQueue[session.currentPickIndex]
  const targetSlot = ctx.activeToteSlot ?? session.currentToteSlot
  const isCartStep = ctx.scannableAsset === "cart"
  const isToteStep = ctx.scannableAsset === "tote"
  const isItemStep = ctx.scannableAsset === "item"
  const isLocationStep = session.currentStep === WorkflowStep.PK_VERIFY_LOCATION

  const isHazmatTote = isToteStep && (session.cart.totes.find((t) => t.slot === targetSlot)?.barcode?.includes("HAZ") || targetSlot === 9)

  const referenceImage = ctx.showShelf
    ? {
        src: "/assets/simulation/aisle_plate.jpg",
        alt: "GEODIS Selective Pallet Racking Pick Face (Aisle 316)",
      }
    : isToteStep
      ? {
          src: isHazmatTote ? "/assets/equipment/tote_hazmat_empty.svg" : "/assets/equipment/tote_standard_empty.svg",
          alt: isHazmatTote ? "GEODIS Hazmat Isolation Tote (TOTE-09-HAZ)" : "GEODIS Standard FliPak Storage Tote",
        }
      : session.currentStep.startsWith("BC_")
        ? {
            src: "/assets/simulation/inbound_dock_plate.jpg",
            alt: "GEODIS Inbound Staging & Receiving Dock",
          }
        : {
            src: "/assets/simulation/Aluminum_warehouse_pick_cart.png",
            alt: "GEODIS 3-Tier Aluminum Order Picking Cart",
          }

  if (ctx.showShelf && pick) {
    const imageScan = isItemStep
      ? () => onScan(pick.item.upcBarcode)
      : isLocationStep
        ? () => onScan(pick.location.displayLabel)
        : undefined

    return (
      <div className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100">
        <button
          type="button"
          onClick={imageScan}
          disabled={!imageScan}
          className={`touch-target relative h-48 w-full shrink-0 overflow-hidden rounded-lg border-2 text-left md:h-56 ${
            imageScan ? "border-amber-300 ring-4 ring-amber-300/40 animate-pulse" : "border-slate-600"
          } bg-slate-800`}
        >
          <Image
            src={referenceImage.src}
            alt={referenceImage.alt}
            fill
            sizes="(max-width: 1080px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <div
            className={`absolute inset-x-0 bottom-0 px-3 py-2 text-[10px] font-mono ${
              imageScan ? "bg-amber-400/90 font-bold text-slate-900" : "bg-slate-950/75 text-amber-100"
            }`}
          >
            {imageScan ? "TAP IMAGE TO SCAN" : "GEODIS reference image · interactive targets below"}
          </div>
        </button>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700 pb-3">
          <span className="font-display text-sm font-bold tracking-wide">PICK FRONT</span>
          <span className="font-mono text-xs text-amber-300">{pick.location.displayLabel}</span>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-3 gap-3 rounded border-4 border-orange-700/70 bg-slate-800 p-4">
          {["C", "B", "A"].map((level) => (
            <div key={level} className="grid grid-cols-3 items-center gap-3 border-b-4 border-slate-600/80 px-3 last:border-b-0">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  onClick={() => isItemStep && index === 1 && onScan(pick.item.upcBarcode)}
                  disabled={!isItemStep || index !== 1}
                  className={`touch-target rounded border text-[10px] font-mono transition-colors ${
                    isItemStep && index === 1
                      ? "border-amber-300 bg-amber-300/25 text-amber-100 hover:bg-amber-300/40"
                      : "border-slate-700 bg-slate-700/50 text-slate-500"
                  }`}
                >
                  {index === 1 ? pick.item.description : `ITEM ${level}-${index + 1}`}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3">
          <button
            onClick={() => isLocationStep && onScan(pick.location.displayLabel)}
            disabled={!isLocationStep}
            className="touch-target flex-1 rounded border border-amber-400/60 bg-amber-300/15 px-3 text-xs font-mono text-amber-100 disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
          >
            {t(language, "warehouse.location")} · {pick.location.displayLabel}
          </button>
          <button
            onClick={onConfirm}
            className="touch-target rounded border border-slate-500 bg-slate-700 px-4 text-xs font-mono text-white"
          >
            {t(language, "warehouse.continue")}
          </button>
        </div>
      </div>
    )
  }

  const activeTote = session.cart.totes.find((tote) => tote.slot === targetSlot)
  const imageScan = isCartStep
    ? () => onScan(session.cart.cartBarcode)
    : isToteStep && activeTote
      ? () => onScan(activeTote.barcode)
      : undefined

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100">
      <button
        type="button"
        onClick={imageScan}
        disabled={!imageScan}
        className={`touch-target relative h-48 w-full shrink-0 overflow-hidden rounded-lg border-2 text-left md:h-64 ${
          imageScan ? "border-amber-300 ring-4 ring-amber-300/40 animate-pulse" : "border-slate-600"
        } bg-slate-800`}
      >
        <Image
          src={referenceImage.src}
          alt={referenceImage.alt}
          fill
          sizes="(max-width: 1080px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        <div
          className={`absolute inset-x-0 bottom-0 px-3 py-2 text-[10px] font-mono ${
            imageScan ? "bg-amber-400/90 font-bold text-slate-900" : "bg-slate-950/75 text-amber-100"
          }`}
        >
          {imageScan ? "TAP IMAGE TO SCAN" : "GEODIS reference image · interactive targets below"}
        </div>
      </button>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-700 pb-3">
        <span className="font-display text-sm font-bold tracking-wide">PICK CART</span>
        <span className="font-mono text-xs text-amber-300">{session.cart.cartBarcode}</span>
      </div>
      <button
        onClick={() => isCartStep && onScan(session.cart.cartBarcode)}
        disabled={!isCartStep}
        className={`touch-target w-full shrink-0 rounded border-2 p-4 text-left transition-colors ${
          isCartStep
            ? "border-amber-300 bg-amber-300/20 hover:bg-amber-300/35"
            : "border-slate-700 bg-slate-800 text-slate-500"
        }`}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider">{t(language, "warehouse.cart")}</div>
        <div className="mt-1 font-mono text-lg font-bold">{session.cart.cartBarcode}</div>
        <div className="mt-2 text-xs text-slate-300">{isCartStep ? "Tap to scan Cart" : "Cart registered"}</div>
      </button>
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto">
        {session.cart.totes.map((tote) => {
          const active = isToteStep && tote.slot === targetSlot
          return (
            <button
              key={tote.toteId}
              onClick={() => active && onScan(tote.barcode)}
              disabled={!active}
              className={`touch-target min-h-20 rounded border p-2 text-left ${
                active
                  ? "border-amber-300 bg-amber-300/25 text-amber-100"
                  : "border-slate-700 bg-slate-800 text-slate-500"
              }`}
            >
              <div className="text-[10px] font-mono">S{tote.slot}</div>
              <div className="mt-1 break-all text-[9px] font-mono">{tote.barcode}</div>
              {active && <div className="mt-1 text-[9px] font-semibold">TAP TO SCAN</div>}
            </button>
          )
        })}
      </div>
      {activeTote && isToteStep && (
        <div className="shrink-0 rounded border border-amber-400/40 bg-amber-300/10 p-3 text-xs font-mono text-amber-100">
          Active Tote: S{activeTote.slot}
        </div>
      )}
    </div>
  )
}
