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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Панель Репетитора</h1>
            <p className="text-gray-600">Управляйте своими учениками и уроками</p>
          </div>
          <AddStudentDialog onStudentAdded={loadStats} tutorId={userId} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего учеников</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Проведено уроков</p>
                <p className="text-2xl font-bold">{stats.completedLessons}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Заработано</p>
                <p className="text-2xl font-bold">{stats.earnings} ₽</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3">
                <CalendarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Предстоящих уроков</p>
                <p className="text-2xl font-bold">{stats.upcomingLessons}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Ученики</TabsTrigger>
            <TabsTrigger value="calendar">Расписание</TabsTrigger>
            <TabsTrigger value="earnings">Заработок</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsOverview tutorId={userId} />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarView tutorId={userId} />
          </TabsContent>

          <TabsContent value="earnings">
            <TutorEarningsOverview tutorId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
