import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    // Проверяем роль пользователя
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, user:users!inner(*)")
      .eq("id", user.id)
      .single()

    if (!profile?.user || profile.user.role !== "admin") {
      redirect("/dashboard")
    }

    // Получаем всех пользователей
    const { data: users } = await supabase
      .from("users")
      .select("*, tutor_settings(*)")
      .order("created_at", { ascending: false })

    // Получаем всех учеников с репетиторами
    const { data: students } = await supabase
      .from("students")
      .select("*, tutor:users(*)")
      .order("created_at", { ascending: false })

    // Получаем статистику за текущий месяц
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const { data: monthlyStats } = await supabase.rpc("get_admin_monthly_stats", {
      month_start: monthStart.toISOString().split("T")[0],
      month_end: monthEnd.toISOString().split("T")[0],
    })

    return <AdminDashboard users={users || []} students={students || []} monthlyStats={monthlyStats} />
  } catch (error) {
    console.error("[v0] Error in AdminPage:", error)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Configuration Error</h1>
          <p className="text-sm text-red-700">
            Supabase is not properly configured. Please check your environment variables.
          </p>
        </div>
      </div>
    )
  }
}
