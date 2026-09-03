"use client"

import React from "react"

export interface ProtocolHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProtocolHelpModal({ isOpen, onClose }: ProtocolHelpModalProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="protocol-help-modal"
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-[#14181E] border-2 border-[#323D4D] rounded-2xl p-5 shadow-2xl flex flex-col font-mono text-xs text-zinc-200">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#2B3542]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              STANDARD OPERATING PROCEDURE: 4-BEAT CADENCE
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-[#222933] hover:bg-[#303B4A] rounded text-zinc-300 font-bold border border-[#3E4A5C] transition-colors"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* 4-Beat Grid Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          {/* BEAT 1 */}
          <div className="bg-[#192028] border border-amber-500/40 rounded-xl p-3">
            <div className="text-amber-400 font-bold text-xs uppercase flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              1. CONFIRM LOCATION
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              Verify aisle & bay signage on the rack. Scan or key the 2-digit check-digit{" "}
              <strong className="text-amber-300">[ 47 ]</strong> from the shelf beam.
              <strong> Never touch merchandise before verifying location.</strong>
            </p>
          </div>

          {/* BEAT 2 */}
          <div className="bg-[#192028] border border-cyan-500/40 rounded-xl p-3">
            <div className="text-cyan-400 font-bold text-xs uppercase flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              2. VERIFY SKU
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              Locate product in the pick bin. Scan the manufacturer UPC on the carton.
              Validates that the physical item matches the WMS wave pick assignment.
            </p>
          </div>

          {/* BEAT 3 */}
          <div className="bg-[#192028] border border-emerald-500/40 rounded-xl p-3">
            <div className="text-emerald-400 font-bold text-xs uppercase flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              3. CONFIRM QUANTITY
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              Inspect item for visible damage. Check pick quantity on terminal screen, enter
              the verified count on the chiclet numeric pad, and press <strong>ENTER ↵</strong>.
            </p>
          </div>

          {/* BEAT 4 */}
          <div className="bg-[#192028] border border-purple-500/40 rounded-xl p-3">
            <div className="text-purple-400 font-bold text-xs uppercase flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              4. DEPOSIT TO TOTE
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              Place item into the highlighted batch cart tote. Scan tote barcode or confirm
              the slot to advance the wave pick task.
            </p>
          </div>
        </div>

        {/* Industrial Exception Softkeys Quick-Reference */}
        <div className="bg-[#101317] border border-[#262E38] rounded-xl p-3">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1.5">
            INDUSTRIAL EXCEPTION PROTOCOLS (SOFTKEYS)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-[#1B222B] p-1.5 rounded border border-amber-900/50 text-amber-300">
              <strong>^K (SHORT PICK):</strong> Insufficient shelf inventory
            </div>
            <div className="bg-[#1B222B] p-1.5 rounded border border-cyan-900/50 text-cyan-300">
              <strong>^M (MANUAL):</strong> Scratched / unreadable barcode
            </div>
            <div className="bg-[#1B222B] p-1.5 rounded border border-orange-900/50 text-orange-300">
              <strong>^D (DAMAGE):</strong> Crushed or torn carton
            </div>
            <div className="bg-[#1B222B] p-1.5 rounded border border-red-900/50 text-red-300">
              <strong>^H (HAZMAT):</strong> Liquid leak or puncture
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-2 border-t border-[#2B3542] flex justify-between items-center text-[10px] text-zinc-500">
          <span>Kinetic OS Standard Warehouse Operations · GEODIS Tier</span>
          <button
            type="button"
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 font-bold"
          >
            GOT IT, RESUME PICKING &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
