"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, CheckCircle, DollarSign, Clock, AlertTriangle, BookOpen, Repeat } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Statistics {
  total_students: number
  total_lessons_this_month: number
  completed_lessons_this_month: number
  revenue_this_month: number
  upcoming_lessons_today: number
  students_need_refill: number
  total_remaining_lessons: number
  active_recurring_schedules: number
}

export function EnhancedStatistics() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
    // Обновляем статистику каждые 60 секунд
    const interval = setInterval(fetchStatistics, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStatistics() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc("get_enhanced_statistics")

      if (error) throw error
      setStats(data)
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const completionRate =
    stats.total_lessons_this_month > 0
      ? Math.round((stats.completed_lessons_this_month / stats.total_lessons_this_month) * 100)
      : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Активные ученики</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_students}</div>
          <p className="text-xs text-muted-foreground">Всего учеников в системе</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Уроки в месяце</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_lessons_this_month}</div>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {completionRate}% завершено
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Проведено уроков</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.completed_lessons_this_month}</div>
          <p className="text-xs text-muted-foreground">В этом месяце</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Доход в месяце</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.revenue_this_month.toLocaleString()} ₽</div>
          <p className="text-xs text-muted-foreground">От проведенных уроков</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Уроки сегодня</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.upcoming_lessons_today}</div>
          <p className="text-xs text-muted-foreground">Запланировано на сегодня</p>
        </CardContent>
      </Card>

      <Card className={stats.students_need_refill > 0 ? "border-orange-200 bg-orange-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Нужно пополнение</CardTitle>
          <AlertTriangle
            className={`h-4 w-4 ${stats.students_need_refill > 0 ? "text-orange-600" : "text-muted-foreground"}`}
          />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.students_need_refill > 0 ? "text-orange-600" : ""}`}>
            {stats.students_need_refill}
          </div>
          <p className="text-xs text-muted-foreground">Учеников требуют пополнения</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Всего уроков</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_remaining_lessons}</div>
          <p className="text-xs text-muted-foreground">Оставшихся у всех учеников</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Регулярные расписания</CardTitle>
          <Repeat className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_recurring_schedules}</div>
          <p className="text-xs text-muted-foreground">Активных расписаний</p>
        </CardContent>
      </Card>
    </div>
  )
}
