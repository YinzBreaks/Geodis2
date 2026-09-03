"use client"

import React, { useEffect } from "react"

export interface SoftFailToastProps {
  message: string | null
  onDismiss: () => void
}

export function SoftFailToast({ message, onDismiss }: SoftFailToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => {
      onDismiss()
    }, 4000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      role="alert"
      data-testid="soft-fail-toast"
      className="absolute top-14 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#240A0A] border-2 border-red-500 rounded-xl px-4 py-2.5 shadow-[0_10px_30px_rgba(239,68,68,0.5)] animate-in fade-in slide-in-from-top-4 duration-200 select-none max-w-lg pointer-events-auto"
    >
      <div className="w-8 h-8 rounded-full bg-red-950 border border-red-500 flex items-center justify-center shrink-0">
        <span className="text-red-400 font-bold text-sm">⚠</span>
      </div>

      <div className="flex-1 text-xs font-mono text-red-200">
        <div className="font-black text-red-400 uppercase tracking-wide">
          GUIDED SEQUENCE CORRECTION
        </div>
        <div className="mt-0.5 leading-snug">{message}</div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="px-2 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-300 font-mono text-xs font-bold rounded cursor-pointer transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
