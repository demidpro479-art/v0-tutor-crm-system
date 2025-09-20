"use client"

import type React from "react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import { Trash2, Plus } from "lucide-react"

interface Student {
  id: string
  name: string
  remaining_lessons: number
  is_active: boolean
}

interface RecurringSchedule {
  id: string
  student_id: string
  day_of_week: number
  time_of_day: string
  duration_minutes: number
  is_active: boolean
  student_name: string
}

interface RecurringScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  onScheduleAdded: () => void
}

export function RecurringScheduleDialog({
  open,
  onOpenChange,
  students,
  onScheduleAdded,
}: RecurringScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    student_id: "",
    day_of_week: "",
    time_of_day: "",
    duration_minutes: "60",
  })

  useEffect(() => {
    if (open) {
      fetchSchedules()
    }
  }, [open])

  async function fetchSchedules() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("recurring_schedules")
        .select(`
          *,
          students!inner(name)
        `)
        .order("day_of_week")
        .order("time_of_day")

      if (error) throw error

      const formattedSchedules =
        data?.map((schedule) => ({
          ...schedule,
          student_name: schedule.students.name,
        })) || []

      setSchedules(formattedSchedules)
    } catch (error) {
      console.error("Ошибка загрузки расписаний:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("recurring_schedules").insert([
        {
          student_id: formData.student_id,
          day_of_week: Number.parseInt(formData.day_of_week),
          time_of_day: formData.time_of_day, // Время в пермском формате
          duration_minutes: Number.parseInt(formData.duration_minutes),
          is_active: true,
        },
      ])

      if (error) throw error

      // Сброс формы
      setFormData({
        student_id: "",
        day_of_week: "",
        time_of_day: "",
        duration_minutes: "60",
      })

      setShowAddForm(false)
      fetchSchedules()

      // Генерируем уроки на основе нового расписания
      await generateRecurringLessons()
    } catch (error) {
      console.error("Ошибка добавления расписания:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateRecurringLessons = async () => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc("generate_recurring_lessons", {
        p_weeks_ahead: 4,
      })

      if (error) throw error

      console.log(`Создано ${data} регулярных уроков`)
      onScheduleAdded()
    } catch (error) {
      console.error("Ошибка генерации уроков:", error)
    }
  }

  const toggleSchedule = async (scheduleId: string, isActive: boolean) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("recurring_schedules").update({ is_active: isActive }).eq("id", scheduleId)

      if (error) throw error
      fetchSchedules()
    } catch (error) {
      console.error("Ошибка обновления расписания:", error)
    }
  }

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm("Вы уверены, что хотите удалить это расписание?")) {
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase.from("recurring_schedules").delete().eq("id", scheduleId)

      if (error) throw error
      fetchSchedules()
    } catch (error) {
      console.error("Ошибка удаления расписания:", error)
    }
  }

  const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Регулярное расписание</DialogTitle>
          <DialogDescription>Управление постоянным расписанием уроков</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Существующие расписания */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Текущие расписания</h4>
              <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить расписание
              </Button>
            </div>

            {schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Нет регулярных расписаний</div>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="font-medium">{schedule.student_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {dayNames[schedule.day_of_week]} в {schedule.time_of_day} ({schedule.duration_minutes}{" "}
                              мин)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={schedule.is_active}
                            onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                          />
                          <Button variant="destructive" size="sm" onClick={() => deleteSchedule(schedule.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Форма добавления */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Новое расписание</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="student">Ученик *</Label>
                      <Select
                        value={formData.student_id}
                        onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите ученика" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="day">День недели *</Label>
                      <Select
                        value={formData.day_of_week}
                        onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите день" />
                        </SelectTrigger>
                        <SelectContent>
                          {dayNames.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="time">Время *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time_of_day}
                          onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="duration">Длительность (мин)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="15"
                          step="15"
                          value={formData.duration_minutes}
                          onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Добавление..." : "Добавить"}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
