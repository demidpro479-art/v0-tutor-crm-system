import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CalendarView } from "@/components/calendar-view"
import { Navigation } from "@/components/navigation"

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="lg:pl-72">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Календарь уроков</h1>
            <p className="text-muted-foreground">Планирование и управление расписанием</p>
          </div>

          <CalendarView />
        </div>
      </main>
    </div>
  )
}
