/**
 * POST /api/screener/submit — Kiosk Candidate Screener Intake
 *
 * Security & PII Redaction Contract:
 * 1. Rate-Limited: Max 10 submissions per 5 minutes per station/IP.
 * 2. Zero Plaintext PII: SSN-4 is salted and hashed immediately upon ingest;
 *    government identifiers are never logged or stored in plaintext.
 * 3. Server-Side Cadence Verification: Evaluates drill metrics and computes
 *    algorithmic hiring recommendation (GREEN, AMBER, RED).
 */

import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter"
import { hashCandidateIdentifier } from "@/lib/security/crypto-utils"

export interface ScreenerSubmissionPayload {
  candidateName: string
  email: string
  phone?: string
  ssnLast4: string
  stationId?: string
  facilityId?: string
  picksCompleted: number
  durationSeconds: number
  errors: number
  backtracks: number
}

export async function POST(request: NextRequest) {
  // ── 1. RATE LIMIT ENFORCEMENT ─────────────────────────────────────────────
  const clientIp = getClientIp(request)
  const rateLimitKey = `screener_kiosk_${clientIp}`
  const rateLimit = checkRateLimit(rateLimitKey, 10, 5 * 60 * 1000)

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Too Many Requests: Rate limit exceeded for this station. Please wait before submitting next candidate.",
        resetTime: rateLimit.resetTime,
      },
      { status: 429 }
    )
  }

  let body: ScreenerSubmissionPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const {
    candidateName,
    email,
    ssnLast4,
    facilityId = "FAC-BBWD-01",
    picksCompleted,
    durationSeconds,
    errors = 0,
    backtracks = 0,
  } = body

  // Validation
  if (!candidateName || !email || !ssnLast4) {
    return NextResponse.json(
      { error: "Missing required candidate fields: name, email, and SSN-4" },
      { status: 400 }
    )
  }

  if (typeof picksCompleted !== "number" || typeof durationSeconds !== "number" || durationSeconds <= 0) {
    return NextResponse.json(
      { error: "Invalid drill performance metrics" },
      { status: 400 }
    )
  }

  // ── 2. PII REDACTION & CRYPTOGRAPHIC HASHING ──────────────────────────────
  // Redact SSN-4 into a salted, irreversible identifier
  const candidateHash = hashCandidateIdentifier(ssnLast4, facilityId)

  // ── 3. SERVER-SIDE CADENCE EVALUATION ─────────────────────────────────────
  const durationHours = durationSeconds / 3600
  const drillUph = Number((picksCompleted / durationHours).toFixed(1))

  // Algorithmic 30-day projection: drill UPH + 15% learning curve multiplier
  const projectedUph = Number((drillUph * 1.15).toFixed(1))

  // Cadence Score: 100 baseline minus penalties for errors (-15) and backtracks (-10)
  const cadenceScore = Math.max(
    0,
    Math.round(100 - errors * 15 - backtracks * 10)
  )

  // Recommendation Badge Assignment
  let recommendation: "GREEN" | "AMBER" | "RED"
  let recommendationLabel: string

  if (cadenceScore >= 85 && projectedUph >= 130.0 && errors <= 1) {
    recommendation = "GREEN"
    recommendationLabel = "FAST-TRACK HIRE"
  } else if (cadenceScore >= 70 && projectedUph >= 105.0) {
    recommendation = "AMBER"
    recommendationLabel = "NEEDS SUPERVISION"
  } else {
    recommendation = "RED"
    recommendationLabel = "UNSUITABLE"
  }

  return NextResponse.json({
    success: true,
    candidateHash,
    candidateName,
    facilityId,
    metrics: {
      drillUph,
      projectedUph,
      cadenceScore,
      errors,
      backtracks,
      durationSeconds,
    },
    recommendation,
    recommendationLabel,
    evaluatedAt: new Date().toISOString(),
  })
}
