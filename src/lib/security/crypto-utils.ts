/**
 * crypto-utils.ts — Constant-Time Hash Verification & PII Salt-Hashing
 *
 * Capabilities:
 * 1. verifyHashConstantTime: Protects against side-channel timing attacks
 *    when comparing SHA-256 certificate digests or webhook signatures.
 * 2. hashCandidateIdentifier: Cryptographically salts and hashes candidate PII
 *    (e.g., SSN-4) so raw government identifiers are never logged or persisted.
 */

import crypto from "crypto"

const DEFAULT_SALT = process.env.PII_HASH_SALT || "kinetic_os_geodis_soc2_secure_salt_2026"

/**
 * Constant-time string/hash comparison using Node.js crypto.timingSafeEqual.
 *
 * Avoids early-exit comparisons (like ===) that leak string prefix matches via CPU timing.
 * Safely handles length mismatches without throwing.
 */
export function verifyHashConstantTime(knownHash: string, candidateHash: string): boolean {
  if (typeof knownHash !== "string" || typeof candidateHash !== "string") {
    return false
  }

  const knownBuffer = Buffer.from(knownHash, "utf8")
  const candidateBuffer = Buffer.from(candidateHash, "utf8")

  // timingSafeEqual requires buffers of identical length
  if (knownBuffer.length !== candidateBuffer.length) {
    // Perform a dummy timingSafeEqual against knownBuffer to maintain constant execution time
    crypto.timingSafeEqual(knownBuffer, knownBuffer)
    return false
  }

  return crypto.timingSafeEqual(knownBuffer, candidateBuffer)
}

/**
 * Generates an irreversible salted SHA-256 hash of candidate PII (e.g. SSN-4).
 *
 * @param rawIdentifier - e.g. "4829" or candidate SSN-4
 * @param facilityId - optional facility identifier to namespace the hash
 * @returns Hex-encoded salted SHA-256 hash
 */
export function hashCandidateIdentifier(rawIdentifier: string, facilityId: string = "FAC-BBWD-01"): string {
  const normalized = (rawIdentifier || "").trim().replace(/\D/g, "")
  return crypto
    .createHmac("sha256", DEFAULT_SALT)
    .update(`${facilityId}:${normalized}`)
    .digest("hex")
}
