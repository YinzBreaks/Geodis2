/**
 * Unauthorized Page
 *
 * Shown when a user attempts to access a route their role does not permit.
 * Redirected here by middleware.ts.
 */

import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-zinc-100 font-mono text-2xl font-bold mb-2">
          Access Denied
        </h1>
        <p className="text-zinc-500 font-mono text-sm mb-6">
          Your role does not have permission to access this page.
          If you believe this is an error, contact your facility administrator.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-zinc-800 hover:bg-zinc-700
                     text-zinc-300 font-mono text-sm rounded-lg transition-colors"
        >
          ← Return to Home
        </Link>
      </div>
    </main>
  )
}
