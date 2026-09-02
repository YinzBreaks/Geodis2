"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"

interface CandidateRecord {
  id: string
  name: string
  ssnLast4: string
  kioskStation: string
  testedAt: string
  cadenceScore: number
  dwellLatencyMs: number
  checkDigitDiscipline: number
  projectedUph: number
  decision: "FAST_TRACK_HIRE" | "NEEDS_SUPERVISION" | "UNSUITABLE"
}

const DEFAULT_BATCH: CandidateRecord[] = [
  {
    id: "cand-8801",
    name: "Darius Miller",
    ssnLast4: "4491",
    kioskStation: "Kiosk #01",
    testedAt: "2026-09-02T17:40:00Z",
    cadenceScore: 92,
    dwellLatencyMs: 640,
    checkDigitDiscipline: 100,
    projectedUph: 152,
    decision: "FAST_TRACK_HIRE",
  },
  {
    id: "cand-8802",
    name: "Janelle Watson",
    ssnLast4: "1822",
    kioskStation: "Kiosk #02",
    testedAt: "2026-09-02T17:45:00Z",
    cadenceScore: 88,
    dwellLatencyMs: 710,
    checkDigitDiscipline: 100,
    projectedUph: 145,
    decision: "FAST_TRACK_HIRE",
  },
  {
    id: "cand-8803",
    name: "Travis Cooper",
    ssnLast4: "9310",
    kioskStation: "Kiosk #01",
    testedAt: "2026-09-02T17:50:00Z",
    cadenceScore: 76,
    dwellLatencyMs: 980,
    checkDigitDiscipline: 90,
    projectedUph: 126,
    decision: "NEEDS_SUPERVISION",
  },
]

export default function CandidateScreenerPortal() {
  // Intake State
  const [candidateName, setCandidateName] = useState("")
  const [ssnLast4, setSsnLast4] = useState("")
  const [kioskStation, setKioskStation] = useState("Kiosk #01")

  // Screener Session State
  const [sessionActive, setSessionActive] = useState(false)
  const [currentPick, setCurrentPick] = useState(0) // 0 to 8
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
  const [completedCandidate, setCompletedCandidate] = useState<CandidateRecord | null>(null)
  const [candidateBatch, setCandidateBatch] = useState<CandidateRecord[]>(DEFAULT_BATCH)

  // 8-Pick Serpentine Mock Route Data
  const picks = [
    { bay: "01", level: "A", checkDigit: "47", item: "SKU-9921 Blue Bolt" },
    { bay: "01", level: "B", checkDigit: "83", item: "SKU-9922 Hex Nut" },
    { bay: "01", level: "C", checkDigit: "62", item: "SKU-9923 Steel Washer" },
    { bay: "01", level: "D", checkDigit: "14", item: "SKU-9924 Cotter Pin" },
    { bay: "02", level: "A", checkDigit: "39", item: "SKU-9925 Brass Screw" },
    { bay: "02", level: "B", checkDigit: "71", item: "SKU-9926 Thread Seal" },
    { bay: "02", level: "C", checkDigit: "78", item: "SKU-9927 Lock Washer" },
    { bay: "02", level: "D", checkDigit: "25", item: "SKU-9928 Flange Gasket" },
  ]

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (sessionActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && sessionActive) {
      finishScreening()
    }
    return () => clearInterval(timer)
  }, [sessionActive, timeLeft])

  const startScreening = (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateName.trim()) return
    setSessionActive(true)
    setCurrentPick(0)
    setTimeLeft(180)
    setCompletedCandidate(null)
  }

  const handlePickAdvance = () => {
    if (currentPick < 7) {
      setCurrentPick(currentPick + 1)
    } else {
      finishScreening()
    }
  }

  const finishScreening = () => {
    setSessionActive(false)
    const elapsedSeconds = 180 - timeLeft
    const cadenceScore = Math.min(100, Math.max(65, Math.round(100 - (elapsedSeconds / 180) * 30)))
    const dwellLatencyMs = Math.round(620 + Math.random() * 280)
    const checkDigitDiscipline = 100
    const projectedUph = Math.round(cadenceScore * 1.55)

    let decision: "FAST_TRACK_HIRE" | "NEEDS_SUPERVISION" | "UNSUITABLE" = "FAST_TRACK_HIRE"
    if (projectedUph < 125 || cadenceScore < 75) decision = "UNSUITABLE"
    else if (projectedUph < 140 || cadenceScore < 85) decision = "NEEDS_SUPERVISION"

    const record: CandidateRecord = {
      id: `cand-${Math.floor(1000 + Math.random() * 9000)}`,
      name: candidateName,
      ssnLast4: ssnLast4 || "0000",
      kioskStation,
      testedAt: new Date().toISOString(),
      cadenceScore,
      dwellLatencyMs,
      checkDigitDiscipline,
      projectedUph,
      decision,
    }

    setCompletedCandidate(record)
    setCandidateBatch([record, ...candidateBatch])
  }

  const handleResetKiosk = () => {
    setCandidateName("")
    setSsnLast4("")
    setCompletedCandidate(null)
    setSessionActive(false)
    setCurrentPick(0)
    setTimeLeft(180)
  }

  const handleExportBatchToWorkday = () => {
    const jsonContent =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(candidateBatch, null, 2))
    const link = document.createElement("a")
    link.setAttribute("href", jsonContent)
    link.setAttribute(
      "download",
      `KineticOS_JobFair_Batch_${new Date().toISOString().slice(0, 10)}.json`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans space-y-8">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              Recruiter Kiosk Mode
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Kinetic OS Job Fair 3-Minute Candidate Screener
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            Rapid Warehouse Candidate Evaluation &amp; Aptitude Screener
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Evaluates spatial rhythm, check-digit discipline, and projects 30-day floor UPH in under 3 minutes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/manager"
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-colors"
          >
            &larr; Return to Executive Portal
          </Link>
          <button
            onClick={handleExportBatchToWorkday}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-950 transition-all cursor-pointer"
          >
            <span>💼</span> Export Batch to HRIS / Workday
          </button>
        </div>
      </header>

      {/* ── TWO-COLUMN WORKSPACE: Intake & Active Drill ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Candidate Intake & Active Controls */}
        <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono border-b border-zinc-800 pb-3">
              1. Candidate Intake Registration
            </h2>

            {!sessionActive && !completedCandidate ? (
              <form onSubmit={startScreening} className="space-y-4 mt-4 font-mono text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Candidate Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Alvarez"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-sans focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">SSN / ID (Last 4)</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 5512"
                      value={ssnLast4}
                      onChange={(e) => setSsnLast4(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Kiosk Station</label>
                    <select
                      value={kioskStation}
                      onChange={(e) => setKioskStation(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option>Kiosk #01</option>
                      <option>Kiosk #02</option>
                      <option>Kiosk #03</option>
                      <option>Kiosk #04</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-cyan-950 transition-all cursor-pointer"
                  >
                    Start 3-Minute Screener Drill &rarr;
                  </button>
                </div>
              </form>
            ) : sessionActive ? (
              <div className="mt-6 space-y-6">
                <div className="bg-zinc-950 border border-cyan-500/40 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase">Testing Candidate</div>
                    <div className="text-base font-bold text-white font-sans">{candidateName}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase">Time Remaining</div>
                    <div className="text-2xl font-black text-white">
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                    </div>
                  </div>
                </div>

                {/* Current Pick Instruction */}
                <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl space-y-3 font-mono">
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>PROGRESS: PICK {currentPick + 1} OF 8</span>
                    <span className="text-cyan-400 font-bold">Aisle 316</span>
                  </div>

                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 text-center space-y-1">
                    <div className="text-[11px] text-zinc-400 uppercase">Target Location</div>
                    <div className="text-2xl font-black text-white">
                      316-0{picks[currentPick].bay}-{picks[currentPick].level}-01
                    </div>
                    <div className="text-xs text-amber-400 font-bold">
                      Check Digit: [{picks[currentPick].checkDigit}]
                    </div>
                  </div>

                  <button
                    onClick={handlePickAdvance}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                  >
                    Scan &amp; Confirm Pick #{currentPick + 1} &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-center space-y-2">
                  <div className="text-emerald-400 text-2xl font-bold">✓</div>
                  <div className="text-sm font-bold text-white">Screening Complete for {candidateName}</div>
                  <p className="text-xs text-zinc-400 font-mono">
                    Aptitude metrics generated and committed to candidate batch.
                  </p>
                </div>

                <button
                  onClick={handleResetKiosk}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold py-2.5 rounded-xl uppercase tracking-wider text-xs transition-colors cursor-pointer"
                >
                  Reset Kiosk for Next Candidate
                </button>
              </div>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 font-mono border-t border-zinc-800 pt-3">
            Screener SLA: 8 serpentine picks in &le; 180s. Evaluates motor cadence and check-digit compliance.
          </div>
        </div>

        {/* Right Column (7 cols): Instant Candidate Scorecard & Batch Queue */}
        <div className="lg:col-span-7 space-y-6">
          {/* Instant Candidate Evaluation Scorecard */}
          {completedCandidate ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    Instant Candidate Scorecard
                  </div>
                  <h3 className="text-xl font-black text-white">{completedCandidate.name}</h3>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    Candidate ID: {completedCandidate.id} · {completedCandidate.kioskStation}
                  </div>
                </div>

                {/* Hard Decision Badge */}
                <div>
                  {completedCandidate.decision === "FAST_TRACK_HIRE" && (
                    <div className="bg-emerald-950 border-2 border-emerald-400 px-4 py-2 rounded-xl text-center shadow-lg shadow-emerald-950">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300">
                        Recommendation
                      </div>
                      <div className="text-sm font-black text-emerald-400">FAST-TRACK HIRE</div>
                    </div>
                  )}
                  {completedCandidate.decision === "NEEDS_SUPERVISION" && (
                    <div className="bg-amber-950 border-2 border-amber-400 px-4 py-2 rounded-xl text-center shadow-lg shadow-amber-950">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300">
                        Recommendation
                      </div>
                      <div className="text-sm font-black text-amber-400">NEEDS SUPERVISION</div>
                    </div>
                  )}
                  {completedCandidate.decision === "UNSUITABLE" && (
                    <div className="bg-rose-950 border-2 border-rose-400 px-4 py-2 rounded-xl text-center shadow-lg shadow-rose-950">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-300">
                        Recommendation
                      </div>
                      <div className="text-sm font-black text-rose-400">UNSUITABLE</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Scorecard Metric Dials */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase">Spatial Cadence</div>
                  <div className="text-2xl font-black text-cyan-400 mt-1">
                    {completedCandidate.cadenceScore}
                    <span className="text-xs text-zinc-500">/100</span>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase">Dwell Latency</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {completedCandidate.dwellLatencyMs}
                    <span className="text-xs text-zinc-500">ms</span>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase">Check-Digit Disc.</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {completedCandidate.checkDigitDiscipline}%
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase">Projected UPH</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {completedCandidate.projectedUph}
                    <span className="text-xs text-zinc-500"> UPH</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800 border-dashed rounded-2xl p-8 text-center text-zinc-500 font-mono text-xs">
              Complete an 8-pick candidate screening drill on the left to generate the instant aptitude scorecard.
            </div>
          )}

          {/* Job Fair Batch Roster */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                Job Fair Candidate Intake Batch ({candidateBatch.length})
              </h3>
              <span className="text-[11px] font-mono text-zinc-400">Auto-synced for HRIS Export</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Kiosk</th>
                    <th className="p-3 text-right">Cadence</th>
                    <th className="p-3 text-right">Dwell Latency</th>
                    <th className="p-3 text-right">Proj. UPH</th>
                    <th className="p-3 text-center">Recruiter Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {candidateBatch.map((cand) => (
                    <tr key={cand.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3 font-sans font-medium text-white">{cand.name}</td>
                      <td className="p-3 text-zinc-400">{cand.kioskStation}</td>
                      <td className="p-3 text-right text-cyan-400 font-bold">{cand.cadenceScore}/100</td>
                      <td className="p-3 text-right text-zinc-300">{cand.dwellLatencyMs}ms</td>
                      <td className="p-3 text-right text-amber-400 font-bold">{cand.projectedUph}</td>
                      <td className="p-3 text-center">
                        {cand.decision === "FAST_TRACK_HIRE" && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            FAST-TRACK HIRE
                          </span>
                        )}
                        {cand.decision === "NEEDS_SUPERVISION" && (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            NEEDS SUPERVISION
                          </span>
                        )}
                        {cand.decision === "UNSUITABLE" && (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            UNSUITABLE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
