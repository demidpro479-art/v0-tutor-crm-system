"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { FileText, Download, Calendar, User } from "lucide-react"

export function UnpaidLessonsReport() {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<any[]>([])

  useEffect(() => {
    loadReport()
  }, [])

  async function loadReport() {
    const supabase = createClient()

    // Загружаем всех учеников с их балансом
    const { data: students } = await supabase
      .from("students")
      .select("id, name, remaining_lessons, total_paid_lessons")
      .gt("remaining_lessons", 0)
      .order("remaining_lessons", { ascending: false })

    // Для каждого ученика загружаем количество запланированных уроков
    const reportData = await Promise.all(
      (students || []).map(async (student) => {
        const { data: scheduledLessons } = await supabase
          .from("lessons")
          .select("*")
          .eq("student_id", student.id)
          .eq("status", "scheduled")

        return {
          ...student,
          scheduled_count: scheduledLessons?.length || 0,
          unpaid_count: student.remaining_lessons,
        }
      }),
    )

    setReport(reportData)
    setLoading(false)
  }

  const totalUnpaid = report.reduce((sum, item) => sum + item.unpaid_count, 0)

  if (loading) {
    return <div className="text-center py-8">Загрузка отчета...</div>
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Отчет по купленным но не проведенным урокам
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Всего неиспользованных уроков: <strong>{totalUnpaid}</strong>
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="space-y-3">
        {report.map((item) => (
          <Card key={item.id} className="p-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>Всего оплачено: {item.total_paid_lessons}</span>
                    <span>Запланировано: {item.scheduled_count}</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {item.unpaid_count} уроков
              </Badge>
            </div>
          </Card>
        ))}

        {report.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Нет неиспользованных уроков</p>
          </div>
        )}
      </div>
    </Card>
  )
}
