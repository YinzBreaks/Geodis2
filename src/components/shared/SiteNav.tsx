/**
 * SiteNav — role-aware top navigation bar.
 *
 * Server Component: reads the current Supabase session to determine the user's
 * role and renders the appropriate dashboard link. Renders nothing when running
 * on the login page or when the user is not authenticated.
 */

import Link from "next/link"
import { getRoleFromSession, type UserRole } from "@/lib/auth/roles"

// ─── role → dashboard URL mapping ───────────────────────────────────────────

const ROLE_HOME: Record<UserRole, string> = {
  SUPERVISOR: "/dashboard/supervisor",
  PICK_LEAD: "/dashboard/lead",
  WAREHOUSE_MGR: "/dashboard/manager",
  TRAINEE: "/",
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPERVISOR: "Supervisor Dashboard",
  PICK_LEAD: "Lead Dashboard",
  WAREHOUSE_MGR: "Manager Dashboard",
  TRAINEE: "Training Home",
}

// ─── component ───────────────────────────────────────────────────────────────

export default async function SiteNav() {
  const { role } = await getRoleFromSession()

  // No nav when logged out
  if (!role) return null

  const homeHref = ROLE_HOME[role]
  const homeLabel = ROLE_LABEL[role]

  return (
    <nav
      className="w-full border-b border-zinc-800 bg-zinc-950 font-mono"
      aria-label="Site navigation"
    >
      <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between">
        {/* Brand */}
        <Link
          href={homeHref}
          className="text-green-400 text-xs font-bold tracking-widest uppercase hover:text-green-300 transition-colors"
        >
          WarehousePro
        </Link>

        {/* Role link */}
        <div className="flex items-center gap-4 text-xs">
          <Link
            href={homeHref}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {homeLabel}
          </Link>

          {/* Simulator is accessible to everyone */}
          <Link
            href="/sim"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Simulator
          </Link>

          {/* Role badge */}
          <span className="text-zinc-600 border border-zinc-800 px-2 py-0.5 uppercase tracking-wide text-[10px]">
            {role.replace("_", " ")}
          </span>
        </div>
      </div>
    </nav>
  )
}
