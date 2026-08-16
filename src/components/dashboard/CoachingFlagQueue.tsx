"use client"

import { useState } from "react"
import Link from "next/link"
import type {
  CoachingFlagStatus,
  CoachingFlagSummary,
} from "@/services/reporting/coaching-flag-reporting"

export function CoachingFlagQueue({
  initialFlags,
}: {
  initialFlags: CoachingFlagSummary[]
}) {
  const [status, setStatus] = useState<CoachingFlagStatus>("OPEN")
  const [flags, setFlags] = useState(initialFlags)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(nextStatus: CoachingFlagStatus) {
    setStatus(nextStatus)
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/coaching-flags?status=${nextStatus}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as { flags: CoachingFlagSummary[] }
      setFlags(data.flags)
    } catch {
      setError("Unable to load coaching flags")
    } finally {
      setLoading(false)
    }
  }

  async function updateFlag(flag: CoachingFlagSummary) {
    const nextStatus: CoachingFlagStatus =
      flag.status === "OPEN" ? "RESOLVED" : "OPEN"
    setBusyId(flag.id)
    setError(null)
    try {
      const response = await fetch(`/api/coaching-flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          notes: notes[flag.id] || undefined,
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setFlags((current) => current.filter((item) => item.id !== flag.id))
    } catch {
      setError("Unable to update coaching flag")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Coaching Flags
        </h2>
        <div className="flex rounded border border-slate-700 p-0.5 text-xs font-mono">
          {(["OPEN", "RESOLVED"] as const).map((value) => (
            <button
              key={value}
              onClick={() => void load(value)}
              className={`px-3 py-1 ${status === value ? "bg-slate-700 text-white" : "text-slate-400"}`}
            >
              {value === "OPEN" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded border border-slate-800 bg-slate-950/50">
        {loading ? (
          <p className="p-4 text-xs font-mono text-slate-500">Loading flags...</p>
        ) : flags.length === 0 ? (
          <p className="p-4 text-xs font-mono text-slate-500">
            No {status.toLowerCase()} coaching flags.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {flags.map((flag) => (
              <div key={flag.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_220px_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/supervisor/trainee/${flag.traineeId}`}
                      className="text-sm font-semibold text-slate-100 hover:text-amber-300"
                    >
                      {flag.traineeName}
                    </Link>
                    <span className="text-[10px] font-mono text-slate-500">{flag.employeeId}</span>
                    <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                      {flag.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{flag.reason}</p>
                  <p className="mt-1 text-[10px] font-mono text-slate-500">
                    Created by {flag.createdByName} · Owner {flag.ownerName} · {new Date(flag.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <textarea
                  value={notes[flag.id] ?? flag.notes ?? ""}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [flag.id]: event.target.value }))
                  }
                  rows={2}
                  maxLength={2000}
                  placeholder="Resolution notes"
                  className="w-full resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                />

                <button
                  onClick={() => void updateFlag(flag)}
                  disabled={busyId === flag.id}
                  className="min-h-11 rounded border border-amber-400/40 bg-amber-400/10 px-3 text-xs font-semibold text-amber-200 disabled:opacity-50"
                >
                  {busyId === flag.id
                    ? "Saving..."
                    : flag.status === "OPEN"
                      ? "Resolve"
                      : "Reopen"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-mono text-red-400">{error}</p>}
    </section>
  )
}
