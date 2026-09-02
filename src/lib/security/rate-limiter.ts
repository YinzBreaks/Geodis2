/**
 * rate-limiter.ts — Sliding Window In-Memory Rate Limiter
 *
 * Protects public kiosk and recruitment intake endpoints against brute-force
 * submissions, denial of service, and automated candidate spam.
 *
 * Implements sliding-window counter with automatic background cache eviction.
 */

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Periodically evict stale entries every 60 seconds
let cleanupTimer: NodeJS.Timeout | null = null

function ensureCleanupTimer(windowMs: number) {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, record] of rateLimitStore.entries()) {
        record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs)
        if (record.timestamps.length === 0) {
          rateLimitStore.delete(key)
        }
      }
    }, 60000)

    if (cleanupTimer.unref) {
      cleanupTimer.unref()
    }
  }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Checks and records a request against a rate limit threshold.
 *
 * @param key - Unique client identifier (e.g., station IP + endpoint)
 * @param limit - Max requests allowed in the window (default: 10)
 * @param windowMs - Sliding window duration in milliseconds (default: 300,000ms / 5 min)
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 5 * 60 * 1000
): RateLimitResult {
  ensureCleanupTimer(windowMs)

  const now = Date.now()
  let record = rateLimitStore.get(key)

  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(key, record)
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs)

  const currentCount = record.timestamps.length
  const resetTime = (record.timestamps[0] ?? now) + windowMs

  if (currentCount >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime,
    }
  }

  record.timestamps.push(now)

  return {
    success: true,
    limit,
    remaining: limit - (currentCount + 1),
    resetTime,
  }
}

/**
 * Extracts client IP from standard Next.js / Cloudflare / reverse proxy headers.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  const cfConnectingIp = headers.get("cf-connecting-ip")
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  return "127.0.0.1"
}

/**
 * Clears the rate limiter cache (useful for automated testing).
 */
export function clearRateLimitStore() {
  rateLimitStore.clear()
}
