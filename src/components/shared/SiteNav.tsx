/**
 * SiteNav — role-aware top navigation bar.
 *
 * Server Component: reads the current Supabase session to determine the user's
 * role and renders the appropriate dashboard link. Renders nothing when running
 * on the login page or when the user is not authenticated.
 *
 * Industrial Dashboard design system — GEODIS / WAREHOUSEPRO wordmark,
 * amber active links, role pill badge.
 */

import Link from "next/link"
import { getRoleFromSession, type UserRole } from "@/lib/auth/roles"
import { UserMenu } from "@/components/shared/UserMenu"

// ─── role → dashboard URL mapping ───────────────────────────────────────────

const ROLE_HOME: Record<UserRole, string> = {
  SUPERVISOR: "/dashboard/supervisor",
  PICK_LEAD: "/dashboard/lead",
  WAREHOUSE_MGR: "/dashboard/manager",
  TRAINEE: "/dashboard/trainee",
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPERVISOR: "Supervisor Dashboard",
  PICK_LEAD: "Lead Dashboard",
  WAREHOUSE_MGR: "Manager Dashboard",
  TRAINEE: "My Progress",
}

const ROLE_BADGE: Record<UserRole, string> = {
  SUPERVISOR: "SUPERVISOR",
  PICK_LEAD: "PICK LEAD",
  WAREHOUSE_MGR: "MANAGER",
  TRAINEE: "TRAINEE",
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
      style={{
        width: "100%",
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-base)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
      aria-label="Site navigation"
    >
      <div
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "0 1rem",
          height: "3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand — GEODIS / WAREHOUSEPRO */}
        <Link
          href={homeHref}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.75rem",
              color: "var(--color-text-secondary)",
              fontWeight: 500,
              letterSpacing: "0.05em",
            }}
          >
            GEODIS
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>/</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--color-amber)",
              letterSpacing: "0.08em",
            }}
          >
            WAREHOUSEPRO
          </span>
        </Link>

        {/* Right side — nav links + role badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            fontSize: "0.75rem",
          }}
        >
          <Link
            href={homeHref}
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              borderBottom: "2px solid transparent",
              paddingBottom: "2px",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={undefined}
          >
            {homeLabel}
          </Link>

          <Link
            href="/sim"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontWeight: 500,
              borderBottom: "2px solid transparent",
              paddingBottom: "2px",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            Simulator
          </Link>

          {/* Role badge with sign-out dropdown */}
          <UserMenu roleBadge={roleBadge} email={email} />
        </div>
      </div>
    </nav>
  )
}
