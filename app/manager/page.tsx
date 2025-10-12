import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { ManagerDashboard } from "@/components/manager-dashboard"

export default async function ManagerPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is manager or admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || (profile.role !== "manager" && profile.role !== "admin")) {
    redirect("/dashboard")
  }

  return <ManagerDashboard userId={user.id} />
}
