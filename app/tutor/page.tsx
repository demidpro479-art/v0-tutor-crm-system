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

    // Check if user is tutor
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || (profile.role !== "tutor" && profile.role !== "admin")) {
      redirect("/dashboard")
    }

    return <TutorDashboard userId={user.id} />
  } catch (error) {
    console.error("[v0] Error in TutorPage:", error)
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
