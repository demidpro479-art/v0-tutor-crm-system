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
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Plus, Minus, Save, X } from "lucide-react"
import { toast } from "sonner"

interface Student {
  id: string
  user_id?: string
  full_name: string
  email: string
  phone_number?: string
  total_paid_lessons?: number
  remaining_lessons?: number
  completed_lessons?: number
  is_active?: boolean
  created_at: string
}

interface StudentDetailsDialogProps {
  student: Student
  open: boolean
  onOpenChange: (open: boolean) => void
  onStudentUpdated: () => void
}

export function StudentDetailsDialog({ student, open, onOpenChange, onStudentUpdated }: StudentDetailsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: student.full_name || "",
    email: student.email || "",
    phone_number: student.phone_number || "",
    total_paid_lessons: student.total_paid_lessons || 0,
    completed_lessons: student.completed_lessons || 0,
  })

  useEffect(() => {
    setFormData({
      full_name: student.full_name || "",
      email: student.email || "",
      phone_number: student.phone_number || "",
      total_paid_lessons: student.total_paid_lessons || 0,
      completed_lessons: student.completed_lessons || 0,
    })
  }, [student])

  const handleUpdate = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      console.log("[v0] Обновление ученика:", student.id, formData)

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          total_paid_lessons: formData.total_paid_lessons,
          completed_lessons: formData.completed_lessons,
        })
        .eq("id", student.id)

      if (error) {
        console.error("[v0] Ошибка обновления:", error)
        toast.error("Ошибка обновления ученика")
        throw error
      }

      toast.success("Данные ученика успешно обновлены")
      onStudentUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Ошибка обновления ученика:", error)
    } finally {
      setLoading(false)
    }
  }

  const remainingLessons = formData.total_paid_lessons - formData.completed_lessons

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование ученика</DialogTitle>
          <DialogDescription>Изменяйте данные ученика, количество оплаченных и проведенных уроков</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Статистика уроков */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="text-3xl font-bold text-blue-900">{formData.total_paid_lessons}</div>
              <div className="text-sm text-blue-700 font-medium">Оплачено</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-3xl font-bold text-green-900">{formData.completed_lessons}</div>
              <div className="text-sm text-green-700 font-medium">Проведено</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <div className="text-3xl font-bold text-purple-900">{remainingLessons}</div>
              <div className="text-sm text-purple-700 font-medium">Осталось</div>
            </div>
          </div>

          <Separator />

          {/* Управление уроками */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Управление уроками</h3>

            <div className="space-y-3">
              <div>
                <Label>Оплачено уроков</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        total_paid_lessons: Math.max(0, formData.total_paid_lessons - 1),
                      })
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={formData.total_paid_lessons}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_paid_lessons: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="text-center text-lg font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        total_paid_lessons: formData.total_paid_lessons + 1,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Проведено уроков</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        completed_lessons: Math.max(0, formData.completed_lessons - 1),
                      })
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={formData.completed_lessons}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        completed_lessons: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="text-center text-lg font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        completed_lessons: formData.completed_lessons + 1,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Личные данные */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Личные данные</h3>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="full_name">Полное имя</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone_number">Телефон</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="mr-2 h-4 w-4" />
            Отмена
          </Button>
          <Button onClick={handleUpdate} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
