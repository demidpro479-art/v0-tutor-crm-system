import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path.startsWith("/auth/")) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (path !== "/") {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
    return supabaseResponse
  }

  const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", user.id).single()

  if (!userData) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const { data: activeRoleData } = await supabase
    .from("user_active_role")
    .select("active_role")
    .eq("user_id", userData.id)
    .single()

  const activeRole = activeRoleData?.active_role

  if (path === "/" || path === "/dashboard") {
    if (activeRole === "super_admin" || activeRole === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url))
    } else if (activeRole === "tutor") {
      return NextResponse.redirect(new URL("/tutor", request.url))
    } else if (activeRole === "manager") {
      return NextResponse.redirect(new URL("/manager", request.url))
    } else if (activeRole === "student") {
      return NextResponse.redirect(new URL("/student", request.url))
    }
  }

  const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", userData.id)
  const roles = userRoles?.map((r) => r.role) || []

  if (path.startsWith("/admin") && !roles.includes("admin") && !roles.includes("super_admin")) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  if (
    path.startsWith("/tutor") &&
    !roles.includes("tutor") &&
    !roles.includes("admin") &&
    !roles.includes("super_admin")
  ) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  if (
    path.startsWith("/manager") &&
    !roles.includes("manager") &&
    !roles.includes("admin") &&
    !roles.includes("super_admin")
  ) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  if (path.startsWith("/student") && !roles.includes("student")) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
