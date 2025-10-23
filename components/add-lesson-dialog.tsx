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
import { Clock, CalendarIcon, Sparkles } from "lucide-react"

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
          original_time: formData.time,
          duration_minutes: Number.parseInt(formData.duration_minutes),
          lesson_type: formData.lesson_type,
          price: Number.parseFloat(formData.price) || null,
          notes: formData.notes || null,
          status: "scheduled",
        },
      ])

      if (error) throw error

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto glass-effect dark:glass-effect-dark border-2 animate-scale-in">
        <DialogHeader className="space-y-3 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Добавить урок
            </span>
          </DialogTitle>
          <DialogDescription className="text-base">
            Создайте новый урок в расписании. Урок будет списан только после отметки "Проведено".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="student" className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Ученик *
              </Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                required
              >
                <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all">
                  <SelectValue placeholder="Выберите ученика" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id} className="py-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{student.name}</span>
                        <span className="ml-4 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                          {student.remaining_lessons} уроков
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="title" className="text-sm font-semibold">
                Название урока
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Урок математики"
                className="h-12 bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="date" className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Дата *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="h-12 bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all"
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="time" className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Время *
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                  className="h-12 bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="duration" className="text-sm font-semibold">
                  Длительность (мин)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="h-12 bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all"
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="price" className="text-sm font-semibold">
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
                  className="h-12 bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all"
                />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="lesson_type" className="text-sm font-semibold">
                Тип урока
              </Label>
              <Select
                value={formData.lesson_type}
                onValueChange={(value) => setFormData({ ...formData, lesson_type: value })}
              >
                <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900">
                  <SelectItem value="regular">Регулярный</SelectItem>
                  <SelectItem value="irregular">Разовый</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Заметки
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Дополнительная информация о уроке..."
                className="bg-white dark:bg-slate-900 border-2 hover:border-primary transition-all resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 border-2">
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.student_id}
              className="h-12 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading ? "Добавление..." : "Добавить урок"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
