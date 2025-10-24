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

      const studentIds = students?.map((s) => s.user_id) || []

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500 mx-auto"></div>
            <Sparkles className="h-6 w-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="mt-6 text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Загрузка панели репетитора...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-2.5 sm:p-3 shadow-lg shadow-blue-500/30">
                <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Панель Репетитора
                </h1>
                <p className="text-slate-400 text-sm sm:text-base md:text-lg mt-1">
                  Управление учениками и расписанием
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <TutorBalanceWidget userId={userId} />
            <AddStudentDialog onStudentAdded={loadStats} tutorId={userId} />
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up">
          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 border-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-blue-400 uppercase tracking-wider">Всего учеников</p>
                <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {stats.totalStudents}
                </p>
                <p className="text-xs text-blue-400/70">Активных студентов</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3 sm:p-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1 border-emerald-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider">
                  Проведено уроков
                </p>
                <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {stats.completedLessons}
                </p>
                <p className="text-xs text-emerald-400/70">Завершенных занятий</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 sm:p-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1 border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-purple-400 uppercase tracking-wider">Заработано</p>
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
                  {stats.earnings.toFixed(0)} ₽
                </p>
                <p className="text-xs text-purple-400/70">Общий доход</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-3 sm:p-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden p-5 sm:p-6 glass-card hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-1 border-orange-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-between">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-orange-400 uppercase tracking-wider">Предстоящих</p>
                <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  {stats.upcomingLessons}
                </p>
                <p className="text-xs text-orange-400/70">Запланировано</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-3 sm:p-4 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-6 animate-scale-in">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="glass-card p-1.5 rounded-xl h-auto gap-2 inline-flex min-w-full sm:min-w-0">
              <TabsTrigger
                value="students"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <Users className="mr-2 h-4 w-4" />
                Ученики
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Расписание
              </TabsTrigger>
              <TabsTrigger
                value="earnings"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 whitespace-nowrap text-sm"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Заработок
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="students" className="animate-fade-in">
            <StudentsOverview tutorId={userId} />
          </TabsContent>

          <TabsContent value="calendar" className="animate-fade-in">
            <CalendarView tutorId={userId} />
          </TabsContent>

          <TabsContent value="earnings" className="animate-fade-in">
            <TutorEarningsOverview tutorId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
