/**
 * Next.js proxy for WarehousePro route protection.
 *
 * Role checks are repeated server-side in pages and API routes; this proxy
 * provides early navigation redirects for protected dashboard paths.
 */

import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/dashboard/supervisor": ["SUPERVISOR"],
  "/dashboard/lead": ["PICK_LEAD"],
  "/dashboard/manager": ["WAREHOUSE_MGR"],
  "/dashboard/trainee": ["TRAINEE", "SUPERVISOR", "PICK_LEAD", "WAREHOUSE_MGR"],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

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

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

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
