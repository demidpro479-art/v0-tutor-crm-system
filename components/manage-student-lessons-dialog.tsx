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
import { createClient } from "@/lib/supabase/client"
import { Settings, Plus, Minus } from "lucide-react"

interface ManageStudentLessonsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: any
  onUpdate: () => void
}

export function ManageStudentLessonsDialog({ open, onOpenChange, student, onUpdate }: ManageStudentLessonsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    total_paid_lessons: 0,
    remaining_lessons: 0,
  })

  useEffect(() => {
    if (student) {
      setFormData({
        total_paid_lessons: student.total_paid_lessons || 0,
        remaining_lessons: student.remaining_lessons || 0,
      })
    }
  }, [student])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("students")
        .update({
          total_paid_lessons: formData.total_paid_lessons,
          remaining_lessons: formData.remaining_lessons,
        })
        .eq("id", student.id)

      if (error) throw error

      onUpdate()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Ошибка обновления баланса уроков:", error)
      alert("Не удалось обновить баланс уроков")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Управление уроками ученика
          </DialogTitle>
          <DialogDescription>
            Измените баланс уроков для {student?.name}. Будьте осторожны при изменении этих значений.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="total_paid_lessons">Всего оплачено уроков</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setFormData({ ...formData, total_paid_lessons: Math.max(0, formData.total_paid_lessons - 1) })
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="total_paid_lessons"
                  type="number"
                  min="0"
                  value={formData.total_paid_lessons}
                  onChange={(e) =>
                    setFormData({ ...formData, total_paid_lessons: Number.parseInt(e.target.value) || 0 })
                  }
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, total_paid_lessons: formData.total_paid_lessons + 1 })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remaining_lessons">Осталось уроков</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setFormData({ ...formData, remaining_lessons: Math.max(0, formData.remaining_lessons - 1) })
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="remaining_lessons"
                  type="number"
                  min="0"
                  value={formData.remaining_lessons}
                  onChange={(e) =>
                    setFormData({ ...formData, remaining_lessons: Number.parseInt(e.target.value) || 0 })
                  }
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, remaining_lessons: formData.remaining_lessons + 1 })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Внимание:</strong> Изменение этих значений напрямую влияет на баланс ученика. Убедитесь, что вы
                понимаете последствия.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
