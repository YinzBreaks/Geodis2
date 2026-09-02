"use client"

import React, { useState } from "react"

export interface FacilityConfig {
  associateHourlyWage: number
  trainerHourlyWage: number
  mispickClaimCost: number
  churnMitigationFactor: number
  certificationUph: number
  ftpaThreshold: number
  maxPutLatencySeconds: number
  workdayWebhookUrl: string
  cornerstoneApiKey: string
  sapEndpoint: string
}

export const DEFAULT_FACILITY_CONFIG: FacilityConfig = {
  associateHourlyWage: 18.0,
  trainerHourlyWage: 25.0,
  mispickClaimCost: 22.0,
  churnMitigationFactor: 630.0,
  certificationUph: 140,
  ftpaThreshold: 99.5,
  maxPutLatencySeconds: 2.2,
  workdayWebhookUrl: "https://api.workday.geodis.internal/v1/certifications",
  cornerstoneApiKey: "csod_prod_live_89b21f9c0e442a",
  sapEndpoint: "https://successfactors.geodis.internal/odata/v2/LmsCertificate",
}

interface AdminConfigDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (config: FacilityConfig) => void
}

export function AdminConfigDrawer({
  isOpen,
  onClose,
  onSave,
}: AdminConfigDrawerProps) {
  const [config, setConfig] = useState<FacilityConfig>(DEFAULT_FACILITY_CONFIG)
  const [savedSuccess, setSavedSuccess] = useState(false)

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave?.(config)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto font-sans text-zinc-100 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex justify-between items-center pb-5 border-b border-zinc-800">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Operations Configuration
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">
                Site Director SLA &amp; Wages
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          {savedSuccess && (
            <div className="my-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
              <span>✓</span> Facility parameters updated and synchronized to engine.
            </div>
          )}

          <form id="admin-config-form" onSubmit={handleSave} className="space-y-6 mt-6">
            {/* Section 1: Facility Wage Constants */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                1. Facility Wage Constants (USD)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-300 font-mono mb-1">
                    Associate Loaded Hourly ($/hr)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    value={config.associateHourlyWage}
                    onChange={(e) =>
                      setConfig({ ...config, associateHourlyWage: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 font-mono mb-1">
                    Lead Trainer Loaded Hourly ($/hr)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    value={config.trainerHourlyWage}
                    onChange={(e) =>
                      setConfig({ ...config, trainerHourlyWage: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 font-mono mb-1">
                    Mis-Pick Defect Cost Claim ($/error)
                  </label>
                  <input
                    type="number"
                    step="1.00"
                    value={config.mispickClaimCost}
                    onChange={(e) =>
                      setConfig({ ...config, mispickClaimCost: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Certification Production SLAs */}
            <div className="pt-4 border-t border-zinc-800/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                2. Certification Production SLAs
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center text-xs text-zinc-300 font-mono mb-1.5">
                    <span>Target Sustained Floor UPH</span>
                    <span className="text-emerald-400 font-bold">{config.certificationUph} UPH</span>
                  </div>
                  <input
                    type="range"
                    min={130}
                    max={160}
                    step={1}
                    value={config.certificationUph}
                    onChange={(e) =>
                      setConfig({ ...config, certificationUph: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs text-zinc-300 font-mono mb-1.5">
                    <span>First-Time Pick Accuracy (FTPA)</span>
                    <span className="text-emerald-400 font-bold">{config.ftpaThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={98.0}
                    max={99.9}
                    step={0.1}
                    value={config.ftpaThreshold}
                    onChange={(e) =>
                      setConfig({ ...config, ftpaThreshold: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 font-mono mb-1">
                    Max Put-to-Slot Latency SLA (seconds)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.maxPutLatencySeconds}
                    onChange={(e) =>
                      setConfig({ ...config, maxPutLatencySeconds: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Enterprise LMS & HRIS Webhooks */}
            <div className="pt-4 border-t border-zinc-800/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                3. LMS / HRIS Webhook Endpoints
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-300 font-mono mb-1">
                    Workday Inbound Webhook URL
                  </label>
                  <input
                    type="url"
                    value={config.workdayWebhookUrl}
                    onChange={(e) =>
                      setConfig({ ...config, workdayWebhookUrl: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none truncate"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 font-mono mb-1">
                    Cornerstone OnDemand API Key
                  </label>
                  <input
                    type="password"
                    value={config.cornerstoneApiKey}
                    onChange={(e) =>
                      setConfig({ ...config, cornerstoneApiKey: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 font-mono mb-1">
                    SAP SuccessFactors REST Target
                  </label>
                  <input
                    type="url"
                    value={config.sapEndpoint}
                    onChange={(e) =>
                      setConfig({ ...config, sapEndpoint: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none truncate"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-zinc-800 flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="admin-config-form"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Save Facility Settings
          </button>
        </div>
      </div>
    </div>
  )
}
