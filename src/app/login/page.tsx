"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getBrowserClient } from "@/lib/supabase/client"

function LoginForm() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = getBrowserClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Redirect: use ?next= param if present, otherwise role default
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role as string | undefined

    const roleRoutes: Record<string, string> = {
      SUPERVISOR: "/dashboard/supervisor",
      PICK_LEAD: "/dashboard/lead",
      WAREHOUSE_MGR: "/dashboard/manager",
      TRAINEE: "/",
    }

    // Hard navigate so the browser sends fresh session cookies through the middleware
    window.location.href = nextPath ?? roleRoutes[role ?? ""] ?? "/"
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-amber-400 font-mono text-2xl font-black tracking-widest uppercase">
            Kinetic OS
          </h1>
          <p className="text-zinc-400 font-mono text-xs mt-1 uppercase tracking-wider">
            Kinetic Workforce Velocity Platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4"
        >
          <h2 className="text-zinc-200 font-mono text-sm font-semibold tracking-wide">
            Sign In
          </h2>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-400 font-mono text-xs">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-400 font-mono text-xs">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {error && (
            <p className="text-red-400 font-mono text-xs bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-green-100 font-mono font-bold py-3 rounded-lg transition-colors text-sm tracking-wide"
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        {/* DEV ONLY — removed at build time in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 font-mono text-xs mb-2 font-semibold">
              DEV ACCOUNTS (password: dev123)
            </p>
            {[
              { email: "supervisor@geodis.local", role: "SUPERVISOR" },
              { email: "lead@geodis.local", role: "PICK_LEAD" },
              { email: "manager@geodis.local", role: "WAREHOUSE_MGR" },
              { email: "trainee@geodis.local", role: "TRAINEE" },
            ].map(({ email: e, role }) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setEmail(e)
                  setPassword("dev123")
                }}
                className="block w-full text-left text-zinc-400 hover:text-green-400 font-mono text-xs py-0.5 transition-colors"
              >
                {e} <span className="text-zinc-600">({role})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
