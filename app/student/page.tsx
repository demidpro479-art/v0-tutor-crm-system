import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentDashboard } from "@/components/student-dashboard"

export default async function StudentPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Получаем профиль пользователя
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // Если это не ученик, перенаправляем на дашборд репетитора
  if (profile?.role !== "student") {
    redirect("/dashboard")
  }

  return <StudentDashboard userId={data.user.id} profile={profile} />
}
