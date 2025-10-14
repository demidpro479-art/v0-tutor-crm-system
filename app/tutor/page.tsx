import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TutorDashboard } from "@/components/tutor-dashboard"

export const dynamic = "force-dynamic"

export default async function TutorPage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", user.id).single()

    if (!userData) {
      redirect("/auth/login")
    }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.id)

    const userRoles = roles?.map((r) => r.role) || []

    // Проверяем что у пользователя есть роль tutor или super_admin
    if (!userRoles.includes("tutor") && !userRoles.includes("super_admin") && !userRoles.includes("admin")) {
      redirect("/dashboard")
    }

    return <TutorDashboard userId={userData.id} />
  } catch (error) {
    console.error("[v0] Error in TutorPage:", error)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Ошибка конфигурации</h1>
          <p className="text-sm text-red-700">Supabase не настроен правильно. Проверьте переменные окружения.</p>
        </div>
      </div>
    )
  }
}
