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
      let studentsQuery = supabase.from("students").select("id").eq("is_active", true)

      if (tutorId) {
        studentsQuery = studentsQuery.eq("tutor_id", tutorId).neq("tutor_id", 0)
      }

      const { data: tutorStudents, error: studentsError } = await studentsQuery

      if (studentsError) throw studentsError

      const studentIds = tutorStudents?.map((s) => s.id) || []

      // Получаем базовую статистику
      const { data: basicStats, error: basicError } = await supabase.rpc("get_statistics")
      if (basicError) throw basicError

      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      let weeklyLessonsQuery = supabase
        .from("lessons")
        .select("price")
        .eq("status", "completed")
        .gte("scheduled_at", startOfWeek.toISOString())

      if (tutorId && studentIds.length > 0) {
        weeklyLessonsQuery = weeklyLessonsQuery.in("student_id", studentIds)
      }

      const { data: weeklyLessons, error: weeklyError } = await weeklyLessonsQuery

      if (weeklyError) throw weeklyError

      let completionQuery = supabase.from("lessons").select("status").neq("status", "scheduled")

      if (tutorId && studentIds.length > 0) {
        completionQuery = completionQuery.in("student_id", studentIds)
      }

      const { data: completionData, error: completionError } = await completionQuery

      if (completionError) throw completionError

      let avgPriceQuery = supabase.from("lessons").select("price").eq("status", "completed").not("price", "is", null)

      if (tutorId && studentIds.length > 0) {
        avgPriceQuery = avgPriceQuery.in("student_id", studentIds)
      }

      const { data: avgPriceData, error: avgPriceError } = await avgPriceQuery

      if (avgPriceError) throw avgPriceError

      // Вычисляем дополнительные метрики
      const lessonsThisWeek = weeklyLessons?.length || 0
      const revenueThisWeek = weeklyLessons?.reduce((sum, lesson) => sum + (lesson.price || 0), 0) || 0

      const completedLessons = completionData?.filter((l) => l.status === "completed").length || 0
      const totalNonScheduled = completionData?.length || 0
      const completionRate = totalNonScheduled > 0 ? (completedLessons / totalNonScheduled) * 100 : 0

      const avgPrice =
        avgPriceData?.length > 0
          ? avgPriceData.reduce((sum, lesson) => sum + (lesson.price || 0), 0) / avgPriceData.length
          : 0

      const combinedStats = tutorId
        ? {
            total_students: tutorStudents?.length || 0,
            active_students: tutorStudents?.length || 0,
            total_lessons_completed: completedLessons,
            total_revenue: avgPriceData?.reduce((sum, lesson) => sum + (lesson.price || 0), 0) || 0,
            lessons_this_month: 0, // TODO: добавить подсчет за месяц
            revenue_this_month: 0, // TODO: добавить подсчет за месяц
            lessons_this_week: lessonsThisWeek,
            revenue_this_week: revenueThisWeek,
            average_lesson_price: avgPrice,
            completion_rate: completionRate,
          }
        : {
            ...basicStats[0],
            lessons_this_week: lessonsThisWeek,
            revenue_this_week: revenueThisWeek,
            average_lesson_price: avgPrice,
            completion_rate: completionRate,
          }

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
