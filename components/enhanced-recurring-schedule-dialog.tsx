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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Trash2, Plus, Calendar, Clock, Users } from "lucide-react"

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

interface EnhancedRecurringScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  onScheduleAdded: () => void
}

export function EnhancedRecurringScheduleDialog({
  open,
  onOpenChange,
  students,
  onScheduleAdded,
}: EnhancedRecurringScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    student_id: "",
    selected_days: [] as number[],
    time_of_day: "",
    duration_minutes: "60",
    create_lessons_immediately: true,
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

      // Создаем расписание для каждого выбранного дня
      const schedulePromises = formData.selected_days.map((dayOfWeek) =>
        supabase.from("recurring_schedules").insert([
          {
            student_id: formData.student_id,
            day_of_week: dayOfWeek,
            time_of_day: formData.time_of_day,
            duration_minutes: Number.parseInt(formData.duration_minutes),
            is_active: true,
          },
        ]),
      )

      const results = await Promise.all(schedulePromises)

      // Проверяем на ошибки
      for (const result of results) {
        if (result.error) throw result.error
      }

      // Если нужно создать уроки сразу
      if (formData.create_lessons_immediately && formData.selected_days.length > 0) {
        const { data, error } = await supabase.rpc("create_lessons_from_multiple_schedule", {
          p_student_id: formData.student_id,
          p_schedule_days: formData.selected_days,
          p_time_of_day: formData.time_of_day,
          p_duration_minutes: Number.parseInt(formData.duration_minutes),
          p_weeks_ahead: 4,
        })

        if (error) {
          console.error("Ошибка создания уроков:", error)
        } else {
          console.log(`Создано ${data} уроков`)
        }
      }

      // Сброс формы
      setFormData({
        student_id: "",
        selected_days: [],
        time_of_day: "",
        duration_minutes: "60",
        create_lessons_immediately: true,
      })

      setShowAddForm(false)
      fetchSchedules()
      onScheduleAdded()
    } catch (error) {
      console.error("Ошибка добавления расписания:", error)
    } finally {
      setLoading(false)
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

  const handleDayToggle = (dayIndex: number, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        selected_days: [...formData.selected_days, dayIndex].sort(),
      })
    } else {
      setFormData({
        ...formData,
        selected_days: formData.selected_days.filter((day) => day !== dayIndex),
      })
    }
  }

  const generateAllLessons = async () => {
    const supabase = createClient()
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc("generate_recurring_lessons_fixed", {
        p_weeks_ahead: 4,
      })

      if (error) throw error

      console.log(`Создано ${data} регулярных уроков`)
      onScheduleAdded()
    } catch (error) {
      console.error("Ошибка генерации уроков:", error)
    } finally {
      setLoading(false)
    }
  }

  const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
  const dayNamesShort = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

  // Группируем расписания по ученикам
  const groupedSchedules = schedules.reduce(
    (acc, schedule) => {
      const key = `${schedule.student_id}-${schedule.student_name}`
      if (!acc[key]) {
        acc[key] = {
          student_name: schedule.student_name,
          student_id: schedule.student_id,
          schedules: [],
        }
      }
      acc[key].schedules.push(schedule)
      return acc
    },
    {} as Record<string, { student_name: string; student_id: string; schedules: RecurringSchedule[] }>,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Регулярное расписание
          </DialogTitle>
          <DialogDescription>
            Управление постоянным расписанием уроков. Время указывается в пермском часовом поясе (UTC+5).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Кнопки управления */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} variant="default">
                <Plus className="h-4 w-4 mr-1" />
                Добавить расписание
              </Button>
              <Button size="sm" onClick={generateAllLessons} variant="outline" disabled={loading}>
                <Clock className="h-4 w-4 mr-1" />
                Создать все уроки
              </Button>
            </div>
          </div>

          {/* Форма добавления */}
          {showAddForm && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Новое расписание
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-6">
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
                              <div className="flex items-center justify-between w-full">
                                <span>{student.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {student.remaining_lessons} уроков
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3">
                      <Label>Дни недели *</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {dayNamesShort.map((day, index) => (
                          <div key={index} className="flex flex-col items-center space-y-2">
                            <Label htmlFor={`day-${index}`} className="text-sm font-medium">
                              {day}
                            </Label>
                            <Checkbox
                              id={`day-${index}`}
                              checked={formData.selected_days.includes(index)}
                              onCheckedChange={(checked) => handleDayToggle(index, checked as boolean)}
                            />
                          </div>
                        ))}
                      </div>
                      {formData.selected_days.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {formData.selected_days.map((dayIndex) => (
                            <Badge key={dayIndex} variant="secondary">
                              {dayNamesShort[dayIndex]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="time">Время (Пермское UTC+5) *</Label>
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

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="create-immediately"
                        checked={formData.create_lessons_immediately}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, create_lessons_immediately: checked as boolean })
                        }
                      />
                      <Label htmlFor="create-immediately" className="text-sm">
                        Создать уроки сразу (на основе оставшихся занятий у ученика)
                      </Label>
                    </div>

                    <div className="flex space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={loading || formData.selected_days.length === 0}>
                        {loading ? "Добавление..." : "Добавить расписание"}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Существующие расписания */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Текущие расписания ({Object.keys(groupedSchedules).length} учеников)
            </h4>

            {Object.keys(groupedSchedules).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет регулярных расписаний</p>
                <p className="text-sm">Добавьте расписание для автоматического создания уроков</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(groupedSchedules).map((group) => (
                  <Card key={group.student_id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{group.student_name}</span>
                        <Badge variant="outline">{group.schedules.length} расписаний</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {group.schedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <Badge variant={schedule.is_active ? "default" : "secondary"}>
                                {dayNamesShort[schedule.day_of_week]}
                              </Badge>
                              <div>
                                <div className="font-medium">{schedule.time_of_day}</div>
                                <div className="text-sm text-muted-foreground">{schedule.duration_minutes} минут</div>
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
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
