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

      // Создаем дату и время урока
      const scheduledAt = new Date(`${formData.date}T${formData.time}`)

      const { error } = await supabase.from("lessons").insert([
        {
          student_id: formData.student_id,
          title: formData.title || "Урок",
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: Number.parseInt(formData.duration_minutes),
          lesson_type: formData.lesson_type,
          price: Number.parseFloat(formData.price) || null,
          notes: formData.notes || null,
          status: "scheduled",
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

  // Получаем сегодняшнюю дату в формате YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить урок</DialogTitle>
          <DialogDescription>Создайте новый урок в расписании</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
                      {student.name} ({student.remaining_lessons} уроков)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Название урока</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Урок математики"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Дата *</Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time">Время *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div className="grid gap-2">
                <Label htmlFor="price">Стоимость (₽)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lesson_type">Тип урока</Label>
              <Select
                value={formData.lesson_type}
                onValueChange={(value) => setFormData({ ...formData, lesson_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Регулярный</SelectItem>
                  <SelectItem value="irregular">Разовый</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !formData.student_id}>
              {loading ? "Добавление..." : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
