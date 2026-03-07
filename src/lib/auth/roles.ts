/**
 * roles.ts — Role-based authorization for WarehousePro dashboard
 *
 * Three dashboard roles with separate access levels:
 *   SUPERVISOR    — full access, signs off floor-ready
 *   PICK_LEAD     — read-only, assigned trainees only
 *   WAREHOUSE_MGR — aggregate/cohort view only
 *   TRAINEE       — simulation access only, no dashboard
 *
 * Per CLAUDE.md §Tech Stack: Supabase Auth
 * All role checks use this module — never hardcode role strings in components.
 */

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** All recognized user roles in the platform. */
export type UserRole = "SUPERVISOR" | "PICK_LEAD" | "WAREHOUSE_MGR" | "TRAINEE"

/** The result of a role check — either an authenticated user or a rejection. */
export interface AuthResult {
  authorized: boolean
  userId?: string
  role?: UserRole
  facilityId?: string
  assignedTrainees?: string[]
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE → ROLE MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/** Routes and their required roles. */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard/supervisor": ["SUPERVISOR"],
  "/dashboard/lead": ["PICK_LEAD"],
  "/dashboard/manager": ["WAREHOUSE_MGR"],
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE SERVER CLIENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Supabase server client that reads auth cookies.
 * Must be called inside a Server Component or Route Handler (uses next/headers).
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components can't set cookies — safe to ignore
          }
        },
      },
    }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get role from the current Supabase session.
 * Looks up the authenticated user's email in the User table to resolve role.
 *
 * @returns UserRole or null if not authenticated / not found.
 */
export async function getRoleFromSession(): Promise<{
  role: UserRole | null
  userId: string | null
  facilityId: string | null
  assignedTrainees: string[]
}> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { role: null, userId: null, facilityId: null, assignedTrainees: [] }
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: {
      id: true,
      role: true,
      facilityId: true,
      assignedTrainees: true,
    },
  })

  if (!dbUser) {
    return { role: null, userId: null, facilityId: null, assignedTrainees: [] }
  }

  return {
    role: dbUser.role as UserRole,
    userId: dbUser.id,
    facilityId: dbUser.facilityId,
    assignedTrainees: dbUser.assignedTrainees,
  }
}

/**
 * Require one or more roles for a server component or API route.
 * Returns AuthResult — caller should check `authorized` and redirect if false.
 *
 * @param roles - Allowed roles for this resource.
 * @returns AuthResult with user info if authorized, or error if not.
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthResult> {
  const { role, userId, facilityId, assignedTrainees } =
    await getRoleFromSession()

  if (!role || !userId) {
    return { authorized: false, error: "Not authenticated" }
  }

  if (!roles.includes(role)) {
    return {
      authorized: false,
      userId,
      role,
      error: `Role "${role}" not authorized. Required: ${roles.join(", ")}`,
    }
  }

  return {
    authorized: true,
    userId,
    role,
    facilityId: facilityId ?? undefined,
    assignedTrainees: assignedTrainees ?? [],
  }
}

/**
 * Check if a pathname should be protected and which roles are allowed.
 *
 * @param pathname - The request pathname (e.g. "/dashboard/supervisor/trainee/abc")
 * @returns Array of allowed roles, or null if route is not role-protected.
 */
export function getRequiredRoles(pathname: string): UserRole[] | null {
  for (const [route, roles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(route)) {
      return roles
    }
  }
  return null
}
