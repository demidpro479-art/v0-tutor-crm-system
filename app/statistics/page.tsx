import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StatisticsOverview } from "@/components/statistics-overview"
import { RevenueChart } from "@/components/revenue-chart"
import { LessonsChart } from "@/components/lessons-chart"
import { StudentAnalytics } from "@/components/student-analytics"
import { Navigation } from "@/components/navigation"

export const dynamic = "force-dynamic"

export default async function StatisticsPage() {
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Статистика и аналитика</h1>
            <p className="text-muted-foreground">Подробная статистика по урокам, доходам и ученикам</p>
          </div>

          <div className="space-y-8">
            <StatisticsOverview />

            <div className="grid gap-6 lg:grid-cols-2">
              <RevenueChart />
              <LessonsChart />
            </div>

            <StudentAnalytics />
          </div>
        </div>
      </main>
    </div>
  )
}
