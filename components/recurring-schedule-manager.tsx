"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Edit } from "lucide-react"
import { ManageRecurringScheduleDialog } from "@/components/manage-recurring-schedule-dialog"
import { useToast } from "@/hooks/use-toast"

interface RecurringSchedule {
  id: string
  student_id: string
  student_name: string
  day_of_week: number
  time_of_day: string
  is_active: boolean
}

const DAYS = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]

export function RecurringScheduleManager() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const loadSchedules = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("recurring_schedules")
        .select(`
          id,
          student_id,
          day_of_week,
          time_of_day,
          is_active,
          students!inner (
            name
          )
        `)
        .order("day_of_week")
        .order("time_of_day")

      if (error) {
        console.error("[v0] Ошибка загрузки расписаний:", error)
        throw error
      }

      const formattedData = data.map((schedule: any) => ({
        id: schedule.id,
        student_id: schedule.student_id,
        day_of_week: schedule.day_of_week,
        time_of_day: schedule.time_of_day,
        is_active: schedule.is_active,
        student_name: schedule.students?.name || "Неизвестный ученик",
      }))

      setSchedules(formattedData)
    } catch (error) {
      console.error("[v0] Ошибка загрузки расписаний:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить регулярные расписания",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const handleManageSchedule = (studentId: string, studentName: string) => {
    setSelectedStudent({ id: studentId, name: studentName })
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedStudent(null)
    loadSchedules()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Регулярное расписание</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const schedulesByStudent = schedules.reduce(
    (acc, schedule) => {
      if (!acc[schedule.student_id]) {
        acc[schedule.student_id] = {
          studentName: schedule.student_name,
          schedules: [],
        }
      }
      acc[schedule.student_id].schedules.push(schedule)
      return acc
    },
    {} as Record<string, { studentName: string; schedules: RecurringSchedule[] }>,
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Регулярное расписание</CardTitle>
              <CardDescription>Управление повторяющимися уроками всех учеников</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет регулярных расписаний</p>
              <p className="text-sm">Создайте расписание в разделе "Календарь"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(schedulesByStudent).map(([studentId, { studentName, schedules: studentSchedules }]) => (
                <Card key={studentId} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{studentName}</h3>
                      <Button size="sm" onClick={() => handleManageSchedule(studentId, studentName)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Управление
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {studentSchedules.map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{DAYS[schedule.day_of_week]}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{schedule.time_of_day}</span>
                            </div>
                          </div>
                          <Badge variant={schedule.is_active ? "default" : "secondary"}>
                            {schedule.is_active ? "Активно" : "Неактивно"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <ManageRecurringScheduleDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          onScheduleUpdated={loadSchedules}
        />
      )}
    </>
  )
}
