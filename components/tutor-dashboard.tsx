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
    try {
      const supabase = createBrowserClient()

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .eq("tutor_id", userId)
        .neq("tutor_id", 0)
        .eq("is_active", true)

      if (studentsError) {
        console.error("[v0] Error loading students:", studentsError)
        setLoading(false)
        return
      }

      const studentIds = students?.map((s) => s.id) || []

      if (studentIds.length === 0) {
        setStats({
          totalStudents: 0,
          completedLessons: 0,
          earnings: 0,
          upcomingLessons: 0,
        })
        setLoading(false)
        return
      }

      const { count: completedCount, error: completedError } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("status", "completed")

      if (completedError) {
        console.error("[v0] Error loading completed lessons:", completedError)
      }

      const { count: upcomingCount, error: upcomingError } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())

      if (upcomingError) {
        console.error("[v0] Error loading upcoming lessons:", upcomingError)
      }

      const { data: earnings, error: earningsError } = await supabase
        .from("tutor_earnings")
        .select("amount")
        .eq("tutor_id", userId)

      if (earningsError) {
        console.error("[v0] Error loading earnings:", earningsError)
      }

      const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0

      setStats({
        totalStudents: students?.length || 0,
        completedLessons: completedCount || 0,
        earnings: totalEarnings,
        upcomingLessons: upcomingCount || 0,
      })
    } catch (error) {
      console.error("[v0] Error in loadStats:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 bg-clip-text text-transparent drop-shadow-sm">
              Панель Репетитора
            </h1>
            <p className="mt-2 text-slate-600 text-lg">Управляйте своими учениками и отслеживайте заработок</p>
          </div>
          <AddStudentDialog onStudentAdded={loadStats} tutorId={userId} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 p-4 shadow-inner">
                <Users className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Всего учеников</p>
                <p className="text-4xl font-bold text-blue-900 mt-1">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.totalStudents}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-gradient-to-br from-green-100 to-emerald-100 p-4 shadow-inner">
                <BookOpen className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Проведено уроков</p>
                <p className="text-4xl font-bold text-green-900 mt-1">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.completedLessons}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-50 border-purple-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-4 shadow-inner">
                <DollarSign className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Заработано</p>
                <p className="text-4xl font-bold text-purple-900 mt-1">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${stats.earnings.toFixed(0)} ₽`}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-orange-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-gradient-to-br from-orange-100 to-amber-100 p-4 shadow-inner">
                <CalendarIcon className="h-7 w-7 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Предстоящих</p>
                <p className="text-4xl font-bold text-orange-900 mt-1">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.upcomingLessons}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="bg-white shadow-md border-2 p-1 rounded-lg">
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <Users className="mr-2 h-4 w-4" />
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Расписание
            </TabsTrigger>
            <TabsTrigger
              value="earnings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <DollarSign className="mr-2 h-4 w-4" />
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
