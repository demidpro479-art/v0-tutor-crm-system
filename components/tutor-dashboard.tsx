"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Users, DollarSign, BookOpen, Sparkles, TrendingUp } from "lucide-react"
import { AddStudentDialog } from "@/components/add-student-dialog"
import { StudentsOverview } from "@/components/students-overview"
import { CalendarView } from "@/components/calendar-view"
import { TutorEarningsOverview } from "@/components/tutor-earnings-overview"
import { TutorBalanceWidget } from "@/components/tutor-balance-widget"

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
        .from("profiles")
        .select("id, user_id, full_name, email")
        .eq("role", "student")
        .eq("tutor_id", userId)

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

      const { data: lessonsData } = await supabase.from("lessons").select("*").in("student_id", studentIds)

      const completedCount = lessonsData?.filter((l) => l.status === "completed").length || 0
      const upcomingCount =
        lessonsData?.filter((l) => l.status === "scheduled" && new Date(l.scheduled_at) >= new Date()).length || 0

      const completedLessons = lessonsData?.filter((l) => l.status === "completed") || []
      const totalEarnings = completedLessons.reduce((sum, lesson) => sum + Number(lesson.price || 500), 0)

      setStats({
        totalStudents: students?.length || 0,
        completedLessons: completedCount,
        earnings: totalEarnings,
        upcomingLessons: upcomingCount,
      })
    } catch (error) {
      console.error("[v0] Error in loadStats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <Sparkles className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Загрузка панели репетитора...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-3 shadow-lg">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Панель Репетитора
                </h1>
                <p className="text-slate-600 text-lg mt-1">Управление учениками и расписанием</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <TutorBalanceWidget userId={userId} />
            <AddStudentDialog onStudentAdded={loadStats} tutorId={userId} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-blue-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">Всего учеников</p>
                <p className="text-5xl font-bold bg-gradient-to-br from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                  {stats.totalStudents}
                </p>
                <p className="text-xs text-blue-600">Активных студентов</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Проведено уроков</p>
                <p className="text-5xl font-bold bg-gradient-to-br from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                  {stats.completedLessons}
                </p>
                <p className="text-xs text-emerald-600">Завершенных занятий</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-50 border-purple-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-purple-700 uppercase tracking-wider">Заработано</p>
                <p className="text-4xl font-bold bg-gradient-to-br from-purple-700 to-pink-700 bg-clip-text text-transparent">
                  {stats.earnings.toFixed(0)} ₽
                </p>
                <p className="text-xs text-purple-600">Общий доход</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-orange-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-orange-700 uppercase tracking-wider">Предстоящих</p>
                <p className="text-5xl font-bold bg-gradient-to-br from-orange-700 to-amber-700 bg-clip-text text-transparent">
                  {stats.upcomingLessons}
                </p>
                <p className="text-xs text-orange-600">Запланировано</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CalendarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-6 animate-in fade-in duration-1000">
          <TabsList className="glass-effect dark:glass-effect-dark p-1.5 rounded-xl h-auto gap-2">
            <TabsTrigger
              value="students"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <Users className="mr-2 h-4 w-4" />
              Ученики
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Расписание
            </TabsTrigger>
            <TabsTrigger
              value="earnings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 py-3 transition-all duration-300"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
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
