import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
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

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const path = request.nextUrl.pathname

    // Перенаправление на соответствующий дашборд в зависимости от роли
    if (path === "/" || path === "/dashboard") {
      if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url))
      } else if (profile?.role === "tutor") {
        return NextResponse.redirect(new URL("/tutor", request.url))
      } else if (profile?.role === "manager") {
        return NextResponse.redirect(new URL("/manager", request.url))
      } else if (profile?.role === "student") {
        return NextResponse.redirect(new URL("/student", request.url))
      }
    }

    // Защита роутов по ролям
    if (path.startsWith("/admin") && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    if (path.startsWith("/tutor") && profile?.role !== "tutor" && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    if (path.startsWith("/manager") && profile?.role !== "manager" && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    if (path.startsWith("/student") && profile?.role !== "student") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  } else {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    if (!request.nextUrl.pathname.startsWith("/auth") && request.nextUrl.pathname !== "/") {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
