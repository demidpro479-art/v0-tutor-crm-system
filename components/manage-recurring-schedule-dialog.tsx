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
      // Используем новую улучшенную функцию update_recurring_schedule_smart
      const { data, error: updateError } = await supabase.rpc("update_recurring_schedule_smart", {
        p_schedule_id: scheduleId,
        p_new_day_of_week: editData.day_of_week,
        p_new_time_of_day: editData.time_of_day,
        p_new_duration: editData.duration_minutes,
      })

      if (updateError) throw updateError

      console.log("[v0] Результат обновления расписания:", data)

      toast({
        title: "Успешно!",
        description: `Расписание обновлено. Удалено ${data.deleted_lessons} старых уроков, создано ${data.created_lessons} новых`,
      })

      setEditingId(null)
      fetchSchedules()
      onScheduleUpdated()
    } catch (error) {
      console.error("[v0] Ошибка обновления расписания:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить расписание",
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
      // Сначала удаляем все будущие уроки этого расписания
      const { error: lessonsError } = await supabase
        .from("lessons")
        .delete()
        .eq("recurring_schedule_id", scheduleId)
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())

      if (lessonsError) {
        console.error("[v0] Ошибка удаления уроков:", lessonsError)
      }

      // Затем удаляем само расписание
      const { error: scheduleError } = await supabase.from("recurring_schedules").delete().eq("id", scheduleId)

      if (scheduleError) throw scheduleError

      toast({
        title: "Успешно!",
        description: "Расписание и все будущие уроки удалены",
      })

      fetchSchedules()
      onScheduleUpdated()
    } catch (error) {
      console.error("[v0] Ошибка удаления расписания:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось удалить расписание",
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
          <DialogTitle className="text-xl">Регулярное расписание: {studentName}</DialogTitle>
          <DialogDescription>
            При изменении времени все будущие уроки автоматически обновятся на новое время
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Нет регулярных расписаний для этого ученика</p>
              <p className="text-sm mt-2">Создайте расписание в разделе "Календарь"</p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <Card key={schedule.id} className="card-enhanced">
                <CardContent className="p-4">
                  {editingId === schedule.id ? (
                    <div className="space-y-3 animate-slide-in">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs font-medium">День недели</Label>
                          <select
                            className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-background"
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
                          <Label className="text-xs font-medium">Время</Label>
                          <Input
                            type="time"
                            className="mt-1"
                            value={editData.time_of_day}
                            onChange={(e) => setEditData({ ...editData, time_of_day: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Длительность (мин)</Label>
                          <Input
                            type="number"
                            className="mt-1"
                            min="15"
                            step="15"
                            value={editData.duration_minutes}
                            onChange={(e) =>
                              setEditData({ ...editData, duration_minutes: Number.parseInt(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(schedule.id)} disabled={loading} className="flex-1">
                          <Save className="h-4 w-4 mr-1" />
                          Сохранить и обновить уроки
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={loading}>
                          <X className="h-4 w-4 mr-1" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">
                          {dayNames[schedule.day_of_week]} в {schedule.time_of_day}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Длительность: {schedule.duration_minutes} минут
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={schedule.is_active ? "default" : "secondary"} className="px-3 py-1">
                          {schedule.is_active ? "Активно" : "Неактивно"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => startEdit(schedule)} disabled={loading}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSchedule(schedule.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
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
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
