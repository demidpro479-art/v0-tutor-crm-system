"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Users, DollarSign, BookOpen } from "lucide-react"
import { AddStudentDialog } from "@/components/add-student-dialog"
import { StudentsOverview } from "@/components/students-overview"
import { CalendarView } from "@/components/calendar-view"
import { TutorEarningsOverview } from "@/components/tutor-earnings-overview"
import { Loader2 } from "lucide-react"

interface TutorDashboardProps {
  userId: string
}

export function TutorDashboard({ userId }: TutorDashboardProps) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    completedLessons: 0,
    earnings: 0,
    upcomingLessons: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [userId])

  async function loadStats() {
    const supabase = createBrowserClient()

    // Get tutor's students
    const { data: students } = await supabase.from("students").select("id").eq("tutor_id", userId)

    const studentIds = students?.map((s) => s.id) || []

    // Get completed lessons count
    const { count: completedCount } = await supabase
      .from("lessons")
      .select("*", { count: "only", head: true })
      .in("student_id", studentIds)
      .eq("status", "completed")

    // Get upcoming lessons count
    const { count: upcomingCount } = await supabase
      .from("lessons")
      .select("*", { count: "only", head: true })
      .in("student_id", studentIds)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())

    // Get earnings
    const { data: earnings } = await supabase.from("tutor_earnings").select("amount").eq("tutor_id", userId)

    const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0

    setStats({
      totalStudents: students?.length || 0,
      completedLessons: completedCount || 0,
      earnings: totalEarnings,
      upcomingLessons: upcomingCount || 0,
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-purple-900 bg-clip-text text-transparent">
              Панель Репетитора
            </h1>
            <p className="mt-2 text-gray-600">Управляйте своими учениками и отслеживайте заработок</p>
          </div>
          <AddStudentDialog onStudentAdded={loadStats} tutorId={userId} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Всего учеников</p>
                <p className="text-3xl font-bold text-blue-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.totalStudents}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Проведено уроков</p>
                <p className="text-3xl font-bold text-green-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.completedLessons}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Заработано</p>
                <p className="text-3xl font-bold text-purple-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${stats.earnings} ₽`}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3">
                <CalendarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Предстоящих уроков</p>
                <p className="text-3xl font-bold text-orange-900">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.upcomingLessons}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Расписание
            </TabsTrigger>
            <TabsTrigger
              value="earnings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              Заработок
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <StudentsOverview tutorId={userId} />
          </TabsContent>

          <TabsContent value="calendar" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CalendarView tutorId={userId} />
          </TabsContent>

          <TabsContent value="earnings" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <TutorEarningsOverview tutorId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
