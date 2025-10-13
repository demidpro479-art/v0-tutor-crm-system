import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { TutorDashboard } from "@/components/tutor-dashboard"

export default async function TutorPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is tutor
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || (profile.role !== "tutor" && profile.role !== "admin")) {
    redirect("/dashboard")
  }

  return <TutorDashboard userId={user.id} />
}
