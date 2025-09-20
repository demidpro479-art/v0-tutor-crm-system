"use client"

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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Plus, Trash2 } from "lucide-react"

interface Student {
  id: string
  name: string
  email: string
  phone: string
  notes: string
  total_paid_lessons: number
  remaining_lessons: number
  hourly_rate: number
  is_active: boolean
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
  const [showAddLessons, setShowAddLessons] = useState(false)
  const [lessonsToAdd, setLessonsToAdd] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email || "",
    phone: student.phone || "",
    hourly_rate: student.hourly_rate.toString(),
    notes: student.notes || "",
    is_active: student.is_active,
  })

  const handleUpdate = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("students")
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          hourly_rate: Number.parseFloat(formData.hourly_rate) || 0,
          notes: formData.notes || null,
          is_active: formData.is_active,
        })
        .eq("id", student.id)

      if (error) throw error
      onStudentUpdated()
    } catch (error) {
      console.error("Ошибка обновления ученика:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLessons = async () => {
    if (!lessonsToAdd || !paymentAmount) return

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.rpc("add_paid_lessons", {
        p_student_id: student.id,
        p_lessons_count: Number.parseInt(lessonsToAdd),
        p_amount: Number.parseFloat(paymentAmount),
        p_notes: `Добавлено ${lessonsToAdd} уроков`,
      })

      if (error) throw error

      setLessonsToAdd("")
      setPaymentAmount("")
      setShowAddLessons(false)
      onStudentUpdated()
    } catch (error) {
      console.error("Ошибка добавления уроков:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этого ученика? Это действие нельзя отменить.")) {
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("students").delete().eq("id", student.id)

      if (error) throw error
      onStudentUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Ошибка удаления ученика:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Информация об ученике</DialogTitle>
          <DialogDescription>Просмотр и редактирование данных ученика</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Статистика */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{student.total_paid_lessons}</div>
              <div className="text-sm text-muted-foreground">Всего оплачено</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{student.remaining_lessons}</div>
              <div className="text-sm text-muted-foreground">Осталось уроков</div>
            </div>
          </div>

          {/* Добавление уроков */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Управление уроками</h4>
              <Button size="sm" onClick={() => setShowAddLessons(!showAddLessons)}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить уроки
              </Button>
            </div>

            {showAddLessons && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="lessons">Количество уроков</Label>
                  <Input
                    id="lessons"
                    type="number"
                    min="1"
                    value={lessonsToAdd}
                    onChange={(e) => setLessonsToAdd(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Сумма оплаты (₽)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    onClick={handleAddLessons}
                    disabled={loading || !lessonsToAdd || !paymentAmount}
                    className="w-full"
                  >
                    Добавить уроки
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Форма редактирования */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Активный ученик</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="grid gap-3">
              <div>
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="hourly_rate">Стоимость урока (₽)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Заметки</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить
          </Button>

          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
