import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentDashboard } from "@/components/student-dashboard"

export default async function StudentPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // Если это не ученик, перенаправляем на дашборд репетитора
  if (profile?.role !== "student") {
    redirect("/dashboard")
  }

  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", profile.student_id)
    .single()

  if (studentError || !studentData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Профиль не настроен</h1>
          <p className="text-muted-foreground">Обратитесь к репетитору для настройки вашего профиля.</p>
        </div>
      </div>
    )
  }

  return <StudentDashboard userId={data.user.id} profile={profile} studentData={studentData} />
}
