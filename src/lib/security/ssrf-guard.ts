/**
 * ssrf-guard.ts — Enterprise Outbound Webhook SSRF Validation Guard
 *
 * Prevents Server-Side Request Forgery (SSRF) when triggering LMS/HRIS webhooks
 * or external notification dispatches.
 *
 * Blocks:
 * - Insecure protocols (http://, file://, gopher://, ftp://)
 * - Cloud metadata services (e.g. AWS/GCP/Azure 169.254.169.254, metadata.google.internal)
 * - Private RFC-1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Loopback addresses (127.0.0.0/8, localhost, ::1, 0.0.0.0)
 * - Link-local addresses (169.254.0.0/16)
 * - Carrier-grade NAT (100.64.0.0/10)
 */

import { isIP } from "net"

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
])

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or cloud metadata range.
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true // Invalid format, block
  }

  const [a, b] = parts

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true

  // 10.0.0.0/8 (Private RFC 1918)
  if (a === 10) return true

  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure instance metadata 169.254.169.254)
  if (a === 169 && b === 254) return true

  // 172.16.0.0/12 (Private RFC 1918)
  if (a === 172 && b >= 16 && b <= 31) return true

  // 192.168.0.0/16 (Private RFC 1918)
  if (a === 192 && b === 168) return true

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true

  return false
}

/**
 * Validates whether an external webhook URL is safe from SSRF.
 *
 * @param inputUrl - The URL provided for webhook dispatch
 * @returns true if URL is HTTPS and points to a valid public endpoint, false otherwise
 */
export function validateSafeWebhookUrl(inputUrl: string): boolean {
  if (!inputUrl || typeof inputUrl !== "string") {
    return false
  }

  let parsed: URL
  try {
    parsed = new URL(inputUrl)
  } catch {
    return false
  }

  // Enforce HTTPS-only
  if (parsed.protocol !== "https:") {
    return false
  }

  const hostname = parsed.hostname.toLowerCase().trim()

  // Block empty or blocked hostnames
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    return false
  }

  // Block localhost variations and internal TLDs
  if (
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return false
  }

  // Check if hostname is an IP address
  const ipVersion = isIP(hostname)
  if (ipVersion === 4) {
    if (isPrivateOrReservedIpv4(hostname)) {
      return false
    }
  } else if (ipVersion === 6) {
    // IPv6 loopback (::1) or link-local / unique local
    if (
      hostname === "::1" ||
      hostname.startsWith("fe80:") ||
      hostname.startsWith("fc00:") ||
      hostname.startsWith("fd00:")
    ) {
      return false
    }
  }

  // Disallow non-standard ports commonly probed during SSRF (e.g. 22, 23, 25, 3306, 5432, 6379, 8080)
  // Standard HTTPS (443) or omitted port is safe.
  if (parsed.port && parsed.port !== "443") {
    return false
  }

  return true
}
