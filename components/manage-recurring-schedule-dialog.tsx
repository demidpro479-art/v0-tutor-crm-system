"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit2, Save, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RecurringSchedule {
  id: string
  student_id: string
  day_of_week: number
  time_of_day: string
  duration_minutes: number
  is_active: boolean
  student_name: string
}

interface ManageRecurringScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  onScheduleUpdated: () => void
}

export function ManageRecurringScheduleDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  onScheduleUpdated,
}: ManageRecurringScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ day_of_week: 0, time_of_day: "", duration_minutes: 60 })
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchSchedules()
    }
  }, [open, studentId])

  async function fetchSchedules() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("recurring_schedules")
        .select("*")
        .eq("student_id", studentId)
        .order("day_of_week")
        .order("time_of_day")

      if (error) throw error

      setSchedules(data || [])
    } catch (error) {
      console.error("Ошибка загрузки расписаний:", error)
    }
  }

  const startEdit = (schedule: RecurringSchedule) => {
    setEditingId(schedule.id)
    setEditData({
      day_of_week: schedule.day_of_week,
      time_of_day: schedule.time_of_day,
      duration_minutes: schedule.duration_minutes,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (scheduleId: string) => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error: updateError } = await supabase.rpc("update_recurring_schedule_and_lessons", {
        p_schedule_id: scheduleId,
        p_new_day: editData.day_of_week,
        p_new_time: editData.time_of_day,
        p_new_duration: editData.duration_minutes,
      })

      if (updateError) throw updateError

      toast({
        title: "Успешно!",
        description: "Расписание обновлено, старые уроки удалены и созданы новые",
      })

      setEditingId(null)
      fetchSchedules()
      onScheduleUpdated()
    } catch (error) {
      console.error("Ошибка обновления расписания:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить расписание",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm("Удалить это расписание? Все будущие уроки также будут удалены.")) {
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Удаляем все будущие уроки этого расписания
      const { error: lessonsError } = await supabase
        .from("lessons")
        .delete()
        .eq("recurring_schedule_id", scheduleId)
        .gte("scheduled_at", new Date().toISOString())

      if (lessonsError) {
        console.error("Ошибка удаления уроков:", lessonsError)
      }

      // Удаляем расписание
      const { error: scheduleError } = await supabase.from("recurring_schedules").delete().eq("id", scheduleId)

      if (scheduleError) throw scheduleError

      toast({
        title: "Успешно!",
        description: "Расписание и будущие уроки удалены",
      })

      fetchSchedules()
      onScheduleUpdated()
    } catch (error) {
      console.error("Ошибка удаления расписания:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить расписание",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Регулярное расписание: {studentName}</DialogTitle>
          <DialogDescription>Изменения автоматически применятся ко всем будущим урокам</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Нет регулярных расписаний для этого ученика</div>
          ) : (
            schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-4">
                  {editingId === schedule.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">День недели</Label>
                          <select
                            className="w-full mt-1 px-2 py-1 text-sm border rounded"
                            value={editData.day_of_week}
                            onChange={(e) => setEditData({ ...editData, day_of_week: Number.parseInt(e.target.value) })}
                          >
                            {dayNames.map((day, index) => (
                              <option key={index} value={index}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">Время</Label>
                          <Input
                            type="time"
                            className="mt-1 text-sm"
                            value={editData.time_of_day}
                            onChange={(e) => setEditData({ ...editData, time_of_day: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Длительность</Label>
                          <Input
                            type="number"
                            className="mt-1 text-sm"
                            value={editData.duration_minutes}
                            onChange={(e) =>
                              setEditData({ ...editData, duration_minutes: Number.parseInt(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(schedule.id)} disabled={loading}>
                          <Save className="h-3 w-3 mr-1" />
                          Сохранить
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3 mr-1" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {dayNames[schedule.day_of_week]} в {schedule.time_of_day}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Длительность: {schedule.duration_minutes} мин
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={schedule.is_active ? "default" : "secondary"}>
                          {schedule.is_active ? "Активно" : "Неактивно"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => startEdit(schedule)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteSchedule(schedule.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
