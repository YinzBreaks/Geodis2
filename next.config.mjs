/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Transpile CJS packages that ship CommonJS bundles and need to be treated
   * as ESM by Next.js / webpack. Pre-configured for ZXing so any future
   * camera-scan integration works without SSR / __webpack_require__.n errors.
   *
   * Per user fix request: "CommonJS/ESM interop failure" prevention.
   */
  transpilePackages: ["@zxing/browser", "@zxing/library"],

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
}

export default nextConfig
