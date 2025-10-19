"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, DollarSign, Calendar, TrendingUp, Clock, Target, Award } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface DetailedStats {
  total_students: number
  active_students: number
  total_lessons_completed: number
  total_revenue: number
  lessons_this_month: number
  revenue_this_month: number
  lessons_this_week: number
  revenue_this_week: number
  average_lesson_price: number
  completion_rate: number
}

interface StatisticsOverviewProps {
  tutorId?: string
}

export function StatisticsOverview({ tutorId }: StatisticsOverviewProps) {
  const [stats, setStats] = useState<DetailedStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetailedStats()
  }, [tutorId])

  async function fetchDetailedStats() {
    const supabase = createClient()

    try {
      let studentsQuery = supabase.from("profiles").select("id, user_id").eq("role", "student")

      if (tutorId) {
        studentsQuery = studentsQuery.eq("tutor_id", tutorId).not("tutor_id", "is", null)
      }

      const { data: tutorStudents, error: studentsError } = await studentsQuery

      if (studentsError) throw studentsError

      const studentUserIds = tutorStudents?.map((s) => s.user_id) || []

      console.log("[v0] StatisticsOverview - Ученики:", {
        tutorId,
        count: studentUserIds.length,
        studentUserIds,
      })

      let lessonsQuery = supabase.from("lessons").select("*").eq("status", "completed")

      if (tutorId && studentUserIds.length > 0) {
        lessonsQuery = lessonsQuery.in("student_id", studentUserIds)
      }

      const { data: completedLessons, error: lessonsError } = await lessonsQuery

      if (lessonsError) throw lessonsError

      const totalRevenue = completedLessons?.reduce((sum, lesson) => sum + (Number(lesson.price) || 0), 0) || 0

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const lessonsThisMonth = completedLessons?.filter((l) => new Date(l.scheduled_at) >= startOfMonth).length || 0
      const revenueThisMonth =
        completedLessons
          ?.filter((l) => new Date(l.scheduled_at) >= startOfMonth)
          .reduce((sum, lesson) => sum + (Number(lesson.price) || 0), 0) || 0

      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const lessonsThisWeek = completedLessons?.filter((l) => new Date(l.scheduled_at) >= startOfWeek).length || 0
      const revenueThisWeek =
        completedLessons
          ?.filter((l) => new Date(l.scheduled_at) >= startOfWeek)
          .reduce((sum, lesson) => sum + (Number(lesson.price) || 0), 0) || 0

      const avgPrice = completedLessons?.length > 0 ? totalRevenue / completedLessons.length : 0

      let allLessonsQuery = supabase.from("lessons").select("status")

      if (tutorId && studentUserIds.length > 0) {
        allLessonsQuery = allLessonsQuery.in("student_id", studentUserIds)
      }

      const { data: allLessons } = await allLessonsQuery
      const completionRate = allLessons?.length > 0 ? (completedLessons?.length / allLessons.length) * 100 : 0

      const combinedStats = {
        total_students: tutorStudents?.length || 0,
        active_students: tutorStudents?.length || 0,
        total_lessons_completed: completedLessons?.length || 0,
        total_revenue: totalRevenue,
        lessons_this_month: lessonsThisMonth,
        revenue_this_month: revenueThisMonth,
        lessons_this_week: lessonsThisWeek,
        revenue_this_week: revenueThisWeek,
        average_lesson_price: avgPrice,
        completion_rate: completionRate,
      }

      console.log("[v0] StatisticsOverview - Статистика:", combinedStats)

      setStats(combinedStats)
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Активные ученики</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.active_students || 0}</div>
          <p className="text-xs text-muted-foreground">из {stats?.total_students || 0} всего</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Уроков проведено</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total_lessons_completed || 0}</div>
          <p className="text-xs text-muted-foreground">{stats?.lessons_this_month || 0} в этом месяце</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₽{stats?.total_revenue || 0}</div>
          <p className="text-xs text-muted-foreground">₽{stats?.revenue_this_month || 0} в этом месяце</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Эта неделя</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.lessons_this_week || 0}</div>
          <p className="text-xs text-muted-foreground">₽{stats?.revenue_this_week || 0} дохода</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Средняя стоимость</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₽{Math.round(stats?.average_lesson_price || 0)}</div>
          <p className="text-xs text-muted-foreground">за урок</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Процент проведения</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(stats?.completion_rate || 0)}%</div>
          <p className="text-xs text-muted-foreground">уроков проведено</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Производительность</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.lessons_this_week && stats.lessons_this_week > 0 ? "Отлично" : "Хорошо"}
          </div>
          <p className="text-xs text-muted-foreground">{stats?.lessons_this_week || 0} уроков на неделе</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Время работы</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(((stats?.total_lessons_completed || 0) * 60) / 60)}ч</div>
          <p className="text-xs text-muted-foreground">всего проведено</p>
        </CardContent>
      </Card>
    </div>
  )
}
