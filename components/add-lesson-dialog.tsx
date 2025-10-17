"use client"

import type React from "react"
import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Clock, CalendarIcon } from "lucide-react"

interface Student {
  id: string
  name: string
  remaining_lessons: number
  is_active: boolean
}

interface AddLessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  onLessonAdded: () => void
}

export function AddLessonDialog({ open, onOpenChange, students, onLessonAdded }: AddLessonDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    student_id: "",
    title: "",
    date: "",
    time: "",
    duration_minutes: "60",
    lesson_type: "irregular",
    price: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const dateTimeString = `${formData.date}T${formData.time}:00`
      const scheduledAt = new Date(dateTimeString)

      console.log("[v0] Создаем урок с временем:", {
        input: dateTimeString,
        savedTime: scheduledAt.toISOString(),
        displayTime: formData.time,
      })

      const { error } = await supabase.from("lessons").insert([
        {
          student_id: formData.student_id,
          title: formData.title || "Урок",
          scheduled_at: scheduledAt.toISOString(),
          original_time: formData.time, // Сохраняем оригинальное введенное время
          duration_minutes: Number.parseInt(formData.duration_minutes),
          lesson_type: formData.lesson_type,
          price: Number.parseFloat(formData.price) || null,
          notes: formData.notes || null,
          status: "scheduled", // Статус "запланирован" - урок НЕ списывается сразу
        },
      ])

      if (error) throw error

      // Сброс формы
      setFormData({
        student_id: "",
        title: "",
        date: "",
        time: "",
        duration_minutes: "60",
        lesson_type: "irregular",
        price: "",
        notes: "",
      })

      onLessonAdded()
    } catch (error) {
      console.error("Ошибка добавления урока:", error)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto animate-slide-in bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Добавить урок
          </DialogTitle>
          <DialogDescription>
            Создайте новый урок в расписании. Урок будет списан только после отметки "Проведено".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="student" className="text-sm font-medium">
                Ученик *
              </Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                required
              >
                <SelectTrigger className="transition-all">
                  <SelectValue placeholder="Выберите ученика" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{student.name}</span>
                        <span className="ml-3 text-xs text-muted-foreground">({student.remaining_lessons} уроков)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Название урока
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Урок математики"
                className="transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Дата *
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="transition-all"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Время *
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                  className="transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration" className="text-sm font-medium">
                  Длительность (мин)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="transition-all"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price" className="text-sm font-medium">
                  Стоимость (₽)
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1000"
                  className="transition-all"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lesson_type" className="text-sm font-medium">
                Тип урока
              </Label>
              <Select
                value={formData.lesson_type}
                onValueChange={(value) => setFormData({ ...formData, lesson_type: value })}
              >
                <SelectTrigger className="transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Регулярный</SelectItem>
                  <SelectItem value="irregular">Разовый</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Заметки
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Дополнительная информация о уроке..."
                className="transition-all resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !formData.student_id} className="min-w-[120px]">
              {loading ? "Добавление..." : "Добавить урок"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
