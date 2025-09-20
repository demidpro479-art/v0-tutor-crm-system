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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Minus, AlertTriangle } from "lucide-react"

interface Student {
  id: string
  name: string
  remaining_lessons: number
  is_active: boolean
}

interface DeductLessonsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  onLessonsDeducted: () => void
}

export function DeductLessonsDialog({ open, onOpenChange, students, onLessonsDeducted }: DeductLessonsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    student_id: "",
    lessons_count: "1",
    reason: "",
  })

  const selectedStudent = students.find((s) => s.id === formData.student_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const lessonsToDeduct = Number.parseInt(formData.lessons_count)

      // Проверяем, что у ученика достаточно уроков
      if (!selectedStudent || selectedStudent.remaining_lessons < lessonsToDeduct) {
        alert("У ученика недостаточно оплаченных уроков!")
        return
      }

      // Списываем уроки
      const { error: updateError } = await supabase
        .from("students")
        .update({
          remaining_lessons: selectedStudent.remaining_lessons - lessonsToDeduct,
        })
        .eq("id", formData.student_id)

      if (updateError) throw updateError

      // Создаем запись о списании (можно добавить отдельную таблицу для истории)
      const { error: logError } = await supabase.from("lesson_deductions").insert([
        {
          student_id: formData.student_id,
          lessons_deducted: lessonsToDeduct,
          reason: formData.reason,
          deducted_at: new Date().toISOString(),
        },
      ])

      // Если таблицы нет, создадим её позже, пока игнорируем ошибку
      if (logError && !logError.message.includes('relation "lesson_deductions" does not exist')) {
        throw logError
      }

      // Сброс формы
      setFormData({
        student_id: "",
        lessons_count: "1",
        reason: "",
      })

      onLessonsDeducted()
    } catch (error) {
      console.error("Ошибка списания уроков:", error)
      alert("Произошла ошибка при списании уроков")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Minus className="h-5 w-5 text-orange-500" />
            <span>Списать уроки</span>
          </DialogTitle>
          <DialogDescription>Списание оплаченных уроков у ученика (например, за пропуски или отмены)</DialogDescription>
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

            {selectedStudent && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>
                    У ученика <strong>{selectedStudent.name}</strong> осталось{" "}
                    <strong>{selectedStudent.remaining_lessons}</strong> оплаченных уроков
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="lessons_count">Количество уроков для списания *</Label>
              <Input
                id="lessons_count"
                type="number"
                min="1"
                max={selectedStudent?.remaining_lessons || 1}
                value={formData.lessons_count}
                onChange={(e) => setFormData({ ...formData, lessons_count: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Причина списания</Label>
              <Textarea
                id="reason"
                placeholder="Укажите причину списания уроков..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !selectedStudent ||
                Number.parseInt(formData.lessons_count) > selectedStudent.remaining_lessons
              }
              variant="destructive"
            >
              {loading ? "Списание..." : "Списать уроки"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
