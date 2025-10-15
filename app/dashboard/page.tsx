import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin-dashboard"
import { TutorDashboard } from "@/components/tutor-dashboard"
import { ManagerDashboard } from "@/components/manager-dashboard"
import { StudentDashboard } from "@/components/student-dashboard"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  console.log("[v0] Dashboard - User:", user?.id, "Error:", error)

  if (error || !user) {
    redirect("/auth/login")
  }

  let { data: userData } = await supabase.from("users").select("id").eq("auth_user_id", user.id).single()

  console.log("[v0] Dashboard - UserData:", userData)

  if (!userData) {
    console.log("[v0] Dashboard - Creating user profile for:", user.email)

    const { data: newUserId, error: createError } = await supabase.rpc("create_user_profile", {
      p_auth_user_id: user.id,
      p_email: user.email || "",
      p_full_name: user.email?.split("@")[0] || "User",
      p_role: "student",
    })

    if (createError) {
      console.error("[v0] Dashboard - Error creating user:", createError)
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Ошибка создания профиля</CardTitle>
              </div>
              <CardDescription>Не удалось создать профиль. Пожалуйста, обратитесь к администратору.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Email: {user.email}</p>
              <p className="text-sm text-destructive mt-2">{createError.message}</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    userData = { id: newUserId }
    console.log("[v0] Dashboard - User profile created:", userData)
  }

  const { data: activeRoleData } = await supabase
    .from("user_active_role")
    .select("active_role")
    .eq("user_id", userData.id)
    .single()

  let activeRole = activeRoleData?.active_role

  console.log("[v0] Dashboard - Active role:", activeRole)

  if (!activeRole) {
    const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", userData.id)

    console.log("[v0] Dashboard - User roles:", userRoles)

    if (userRoles && userRoles.length > 0) {
      activeRole = userRoles[0].role
      await supabase
        .from("user_active_role")
        .upsert({ user_id: userData.id, active_role: activeRole, updated_at: new Date().toISOString() })

      console.log("[v0] Dashboard - Set active role:", activeRole)
    } else {
      console.log("[v0] Dashboard - No roles found, adding default student role")

      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userData.id, role: "student" })

      if (roleError) {
        console.error("[v0] Dashboard - Error adding default role:", roleError)
      } else {
        activeRole = "student"
        await supabase
          .from("user_active_role")
          .upsert({ user_id: userData.id, active_role: activeRole, updated_at: new Date().toISOString() })

        console.log("[v0] Dashboard - Default student role added")
      }
    }
  }

  if (!activeRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Нет доступных ролей</CardTitle>
            </div>
            <CardDescription>
              У вас нет назначенных ролей в системе. Пожалуйста, обратитесь к администратору для назначения роли.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Email: {user.email}</p>
          </CardContent>
        </Card>
      </div>
    )
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
