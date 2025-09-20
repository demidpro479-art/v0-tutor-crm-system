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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Trash2, User, CheckCircle } from "lucide-react"

interface Lesson {
  id: string
  student_id: string
  title: string
  scheduled_at: string
  duration_minutes: number
  status: string
  lesson_type: string
  price: number
  notes: string
  student_name: string
}

interface LessonDetailsDialogProps {
  lesson: Lesson
  open: boolean
  onOpenChange: (open: boolean) => void
  onLessonUpdated: () => void
}

export function LessonDetailsDialog({ lesson, open, onOpenChange, onLessonUpdated }: LessonDetailsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: lesson.title,
    date: new Date(lesson.scheduled_at).toISOString().split("T")[0],
    time: new Date(lesson.scheduled_at).toTimeString().slice(0, 5),
    duration_minutes: lesson.duration_minutes.toString(),
    status: lesson.status,
    price: lesson.price?.toString() || "",
    notes: lesson.notes || "",
  })

  const handleUpdate = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      // Создаем дату и время урока
      const scheduledAt = new Date(`${formData.date}T${formData.time}`)

      const { error } = await supabase
        .from("lessons")
        .update({
          title: formData.title,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: Number.parseInt(formData.duration_minutes),
          status: formData.status,
          price: Number.parseFloat(formData.price) || null,
          notes: formData.notes || null,
        })
        .eq("id", lesson.id)

      if (error) throw error
      onLessonUpdated()
    } catch (error) {
      console.error("Ошибка обновления урока:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickComplete = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Ошибка завершения урока")
      }

      const result = await response.json()

      if (result.success) {
        onLessonUpdated()
      }
    } catch (error) {
      console.error("Ошибка завершения урока:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот урок?")) {
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("lessons").delete().eq("id", lesson.id)

      if (error) throw error
      onLessonUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Ошибка удаления урока:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      case "missed":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Проведен"
      case "cancelled":
        return "Отменен"
      case "missed":
        return "Пропущен"
      default:
        return "Запланирован"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Детали урока</DialogTitle>
          <DialogDescription>Просмотр и редактирование урока</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация об ученике */}
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{lesson.student_name}</div>
              <div className="text-sm text-muted-foreground">
                {lesson.lesson_type === "regular" ? "Регулярный урок" : "Разовый урок"}
              </div>
            </div>
            <div className="ml-auto flex items-center space-x-2">
              <Badge variant={getStatusColor(lesson.status)}>{getStatusText(lesson.status)}</Badge>
              {lesson.status === "scheduled" && (
                <Button size="sm" onClick={handleQuickComplete} disabled={loading}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Провести
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Форма редактирования */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Название урока</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Дата</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time">Время</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
              <Label htmlFor="status">Статус</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Запланирован</SelectItem>
                  <SelectItem value="completed">Проведен</SelectItem>
                  <SelectItem value="cancelled">Отменен</SelectItem>
                  <SelectItem value="missed">Пропущен</SelectItem>
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
