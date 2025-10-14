import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentsOverview } from "@/components/students-overview"
import { QuickStats } from "@/components/quick-stats"
import { LessonAutoProcessor } from "@/components/lesson-auto-processor"
import { Navigation } from "@/components/navigation"
import { RecurringScheduleManager } from "@/components/recurring-schedule-manager"
import { UndoActionPanel } from "@/components/undo-action-panel"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Добро пожаловать!</h1>
            <p className="text-muted-foreground">Управление учениками и расписанием</p>
          </div>

          <div className="space-y-8">
            <UndoActionPanel />
            <QuickStats />
            <LessonAutoProcessor />
            <RecurringScheduleManager />
            <StudentsOverview />
          </div>
        </div>
      </main>
    </div>
  )
}
