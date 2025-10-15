import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin-dashboard"
import { TutorDashboard } from "@/components/tutor-dashboard"
import { ManagerDashboard } from "@/components/manager-dashboard"
import { StudentDashboard } from "@/components/student-dashboard"
import { Navigation } from "@/components/navigation"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", user.id).single()

  if (!userData) {
    redirect("/auth/login")
  }

  const { data: activeRoleData } = await supabase
    .from("user_active_role")
    .select("active_role")
    .eq("user_id", userData.id)
    .single()

  let activeRole = activeRoleData?.active_role

  if (!activeRole) {
    const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", userData.id).limit(1)

    if (userRoles && userRoles.length > 0) {
      activeRole = userRoles[0].role
      // Устанавливаем активную роль
      await supabase
        .from("user_active_role")
        .upsert({ user_id: userData.id, active_role: activeRole, updated_at: new Date().toISOString() })
    } else {
      // Если нет ролей, редиректим на страницу входа
      redirect("/auth/login")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="lg:pl-72">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {(activeRole === "super_admin" || activeRole === "admin") && <AdminDashboard />}
          {activeRole === "tutor" && <TutorDashboard />}
          {activeRole === "manager" && <ManagerDashboard />}
          {activeRole === "student" && <StudentDashboard />}
        </div>
      </main>
    </div>
  )
}
