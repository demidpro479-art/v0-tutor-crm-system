"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Edit, Trash2 } from "lucide-react"
import { ManageRecurringScheduleDialog } from "@/components/manage-recurring-schedule-dialog"
import { useToast } from "@/hooks/use-toast"

interface RecurringSchedule {
  id: string
  student_id: string
  student_name: string
  day_of_week: number
  time: string
  is_active: boolean
}

const DAYS = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]

export function RecurringScheduleManager() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState<RecurringSchedule | null>(null)
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
          time,
          is_active,
          students!inner (
            name
          )
        `)
        .order("day_of_week")
        .order("time")

      if (error) {
        console.error("[v0] Ошибка загрузки расписаний:", error)
        throw error
      }

      const formattedData = data.map((schedule: any) => ({
        id: schedule.id,
        student_id: schedule.student_id,
        day_of_week: schedule.day_of_week,
        time: schedule.time,
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

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Удалить это регулярное расписание? Все будущие уроки будут удалены.")) {
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.from("recurring_schedules").delete().eq("id", scheduleId)

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Регулярное расписание удалено",
      })

      loadSchedules()
    } catch (error) {
      console.error("[v0] Ошибка удаления расписания:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить расписание",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (schedule: RecurringSchedule) => {
    setSelectedSchedule(schedule)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedSchedule(null)
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Регулярное расписание</CardTitle>
              <CardDescription>Управление повторяющимися уроками</CardDescription>
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
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{schedule.student_name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {DAYS[schedule.day_of_week]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {schedule.time}
                        </span>
                      </div>
                    </div>
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? "Активно" : "Неактивно"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(schedule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(schedule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSchedule && (
        <ManageRecurringScheduleDialog schedule={selectedSchedule} open={dialogOpen} onOpenChange={handleDialogClose} />
      )}
    </>
  )
}
