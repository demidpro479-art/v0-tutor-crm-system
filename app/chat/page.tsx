import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { ChatInterface } from "@/components/chat-interface"

export default async function ChatPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()

  if (!profile) {
    redirect("/auth/sign-in")
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <ChatInterface userId={user.id} userEmail={profile.email} userName={profile.full_name} userRole={profile.role} />
    </div>
  )
}
