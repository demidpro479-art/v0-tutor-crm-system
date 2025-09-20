"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { User, BookOpen, TrendingUp } from "lucide-react"

interface StudentAnalytic {
  id: string
  name: string
  total_paid_lessons: number
  remaining_lessons: number
  completed_lessons: number
  total_revenue: number
  completion_rate: number
  is_active: boolean
}

export function StudentAnalytics() {
  const [students, setStudents] = useState<StudentAnalytic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentAnalytics()
  }, [])

  async function fetchStudentAnalytics() {
    const supabase = createClient()

    try {
      // Получаем данные о студентах
      const { data: studentsData, error: studentsError } = await supabase.from("students").select("*").order("name")

      if (studentsError) throw studentsError

      // Получаем статистику по урокам для каждого студента
      const studentsWithAnalytics = await Promise.all(
        (studentsData || []).map(async (student) => {
          const { data: lessonsData, error: lessonsError } = await supabase
            .from("lessons")
            .select("status, price")
            .eq("student_id", student.id)

          if (lessonsError) throw lessonsError

          const { data: paymentsData, error: paymentsError } = await supabase
            .from("payments")
            .select("amount")
            .eq("student_id", student.id)

          if (paymentsError) throw paymentsError

          const completedLessons = lessonsData?.filter((l) => l.status === "completed").length || 0
          const totalLessons = lessonsData?.length || 0
          const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
          const totalRevenue = paymentsData?.reduce((sum, payment) => sum + payment.amount, 0) || 0

          return {
            ...student,
            completed_lessons: completedLessons,
            completion_rate: completionRate,
            total_revenue: totalRevenue,
          }
        }),
      )

      // Сортируем по доходу (топ студенты)
      studentsWithAnalytics.sort((a, b) => b.total_revenue - a.total_revenue)

      setStudents(studentsWithAnalytics)
    } catch (error) {
      console.error("Ошибка загрузки аналитики студентов:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Аналитика по ученикам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Аналитика по ученикам</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.slice(0, 10).map((student) => (
            <Card key={student.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{student.name}</h3>
                      <Badge variant={student.is_active ? "default" : "secondary"}>
                        {student.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold">₽{student.total_revenue}</div>
                    <div className="text-sm text-muted-foreground">общий доход</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-sm">
                      <BookOpen className="h-3 w-3" />
                      <span className="font-medium">{student.completed_lessons}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">проведено</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-sm">
                      <BookOpen className="h-3 w-3" />
                      <span className="font-medium">{student.remaining_lessons}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">осталось</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-sm">
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-medium">{Math.round(student.completion_rate)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">выполнение</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Прогресс выполнения</span>
                    <span>{Math.round(student.completion_rate)}%</span>
                  </div>
                  <Progress value={student.completion_rate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}

          {students.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Нет данных для отображения</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
