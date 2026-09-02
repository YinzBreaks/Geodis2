/** @type {import('next').NextConfig} */

// Dynamically resolve Supabase HTTP and WebSocket origins for CSP connect-src
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseOrigin = ""
let supabaseWsOrigin = ""
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl)
    supabaseOrigin = parsed.origin
    supabaseWsOrigin = parsed.origin.replace(/^http/, "ws")
  } catch {
    // Ignore URL parse error
  }
}

const connectSrcDirectives = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "http://127.0.0.1:*",
  "http://localhost:*",
  "ws://127.0.0.1:*",
  "ws://localhost:*",
  supabaseOrigin,
  supabaseWsOrigin,
]
  .filter(Boolean)
  .join(" ")

const nextConfig = {
  /**
   * Transpile CJS packages that ship CommonJS bundles and need to be treated
   * as ESM by Next.js / webpack. Pre-configured for ZXing so any future
   * camera-scan integration works without SSR / __webpack_require__.n errors.
   */
  transpilePackages: ["@zxing/browser", "@zxing/library", "three", "@react-three/fiber", "@react-three/drei"],

  webpack: (config) => {
    /**
     * Suppress Node built-in warnings from packages that optionally require
     * 'fs' (e.g. qrcode). These modules are never called server-side in this
     * project, but webpack still tries to resolve the dep.
     */
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    return config
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob:",
              `connect-src ${connectSrcDirectives}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
