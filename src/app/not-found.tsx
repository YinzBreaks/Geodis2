import Link from "next/link"

/**
 * Custom 404 page — maintains the dark terminal aesthetic of the platform.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 font-mono">
      <p className="text-green-400 text-8xl font-bold tracking-widest">404</p>
      <p className="text-zinc-400 text-lg">Page not found.</p>
      <p className="text-zinc-600 text-sm max-w-xs text-center">
        The route you requested doesn&apos;t exist or you don&apos;t have access
        to it.
      </p>
      <Link
        href="/"
        className="mt-2 text-green-400 hover:text-green-300 text-sm border border-green-800 hover:border-green-600 px-4 py-2 transition-colors"
      >
        ← Back to home
      </Link>
    </div>
  )
}
