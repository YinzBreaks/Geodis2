/**
 * middleware.ts — Next.js middleware for WarehousePro
 *
 * Role-based route protection for dashboard routes.
 * Redirect to /unauthorized if the user lacks the required role.
 *
 * Per CLAUDE.md §Tech Stack: Supabase Auth
 * Route protection rules:
 *   /dashboard/supervisor/*  → SUPERVISOR only
 *   /dashboard/lead/*        → PICK_LEAD only
 *   /dashboard/manager/*     → WAREHOUSE_MGR only
 */

import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

/** Route prefix → allowed role(s). */
const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/dashboard/supervisor": ["SUPERVISOR"],
  "/dashboard/lead": ["PICK_LEAD"],
  "/dashboard/manager": ["WAREHOUSE_MGR"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /dashboard/* routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  // Find the matching role restriction
  let requiredRoles: string[] | null = null
  for (const [prefix, roles] of Object.entries(ROUTE_ROLE_MAP)) {
    if (pathname.startsWith(prefix)) {
      requiredRoles = roles
      break
    }
  }

  if (!requiredRoles) {
    return NextResponse.next()
  }

  // Create Supabase client from request cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not authenticated → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // Check user role via user_metadata (set during signup / by admin)
  // In production, this should be validated against the DB User.role
  // For middleware (edge runtime), we use user_metadata as the role source
  const userRole = (user.user_metadata?.role as string) ?? ""

  if (!requiredRoles.includes(userRole)) {
    const url = request.nextUrl.clone()
    url.pathname = "/unauthorized"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
