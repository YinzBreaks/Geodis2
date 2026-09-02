/**
 * SiteNav — role-aware top navigation bar.
 *
 * Server Component: reads the current Supabase session to determine the user's
 * role and renders the appropriate dashboard link.
 *
 * Kinetic OS design system — Tactical Slate canvas, Kinetic OS wordmark,
 * ambient Hardware Scanner Status Pill, and role pill badge.
 */

import Link from "next/link"
import { getRoleFromSession, type UserRole } from "@/lib/auth/roles"
import { UserMenu } from "@/components/shared/UserMenu"
import { HardwareScannerPill } from "@/components/simulator/HardwareScannerPill"

// ─── role → dashboard URL mapping ───────────────────────────────────────────

const ROLE_HOME: Record<UserRole, string> = {
  SUPERVISOR: "/dashboard/supervisor",
  PICK_LEAD: "/dashboard/lead",
  WAREHOUSE_MGR: "/dashboard/manager",
  TRAINEE: "/dashboard/trainee",
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPERVISOR: "Supervisor Command",
  PICK_LEAD: "Floor Lead Hub",
  WAREHOUSE_MGR: "Executive Portal",
  TRAINEE: "My Velocity",
}

const ROLE_BADGE: Record<UserRole, string> = {
  SUPERVISOR: "SUPERVISOR",
  PICK_LEAD: "LEAD",
  WAREHOUSE_MGR: "EXECUTIVE",
  TRAINEE: "ASSOCIATE",
}

// ─── component ───────────────────────────────────────────────────────────────

export default async function SiteNav() {
  const { role, email } = await getRoleFromSession()

  // No nav when logged out
  if (!role) return null

  const homeHref = ROLE_HOME[role]
  const homeLabel = ROLE_LABEL[role]
  const roleBadge = ROLE_BADGE[role]

  return (
    <nav
      className="w-full border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50 font-sans"
      aria-label="Site navigation"
    >
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        {/* Brand — KINETIC OS / VELOCITY PLATFORM */}
        <Link
          href={homeHref}
          className="flex items-center gap-2 text-decoration-none group"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="font-mono text-sm font-black tracking-widest text-white uppercase group-hover:text-amber-400 transition-colors">
              KINETIC OS
            </span>
          </div>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="font-mono text-[11px] text-zinc-400 font-semibold tracking-wider uppercase hidden sm:inline">
            Workforce Velocity Platform
          </span>
        </Link>

        {/* Center/Right — Ambient Hardware Scanner Pill */}
        <div className="hidden md:flex items-center">
          <HardwareScannerPill compact />
        </div>

        {/* Right side — nav links + role badge */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <Link
            href={homeHref}
            className="text-zinc-300 hover:text-white transition-colors"
          >
            {homeLabel}
          </Link>

          <Link
            href="/sim"
            className="text-amber-400 hover:text-amber-300 font-bold transition-colors"
          >
            Simulator
          </Link>

          <Link
            href="/dashboard/screener"
            className="text-cyan-400 hover:text-cyan-300 font-bold hidden sm:inline transition-colors"
          >
            Screener
          </Link>

          {/* Role badge with sign-out dropdown */}
          <UserMenu email={email} roleBadge={roleBadge} />
        </div>
      </div>
    </nav>
  )
}
