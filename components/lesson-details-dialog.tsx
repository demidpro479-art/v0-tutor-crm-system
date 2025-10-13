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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { Trash2, User, CheckCircle, Clock, CalendarIcon, Star, FileText, LinkIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { CancelLessonEarningDialog } from "@/components/cancel-lesson-earning-dialog"

interface Lesson {
  id: string
  student_id: string
  title: string
  scheduled_at: string
  original_time?: string
  duration_minutes: number
  status: string
  lesson_type: string
  price: number
  notes: string
  student_name: string
  grade?: number
  homework?: string
  lesson_link?: string
}

interface LessonDetailsDialogProps {
  lesson: Lesson
  open: boolean
  onOpenChange: (open: boolean) => void
  onLessonUpdated: () => void
}

export function LessonDetailsDialog({ lesson, open, onOpenChange, onLessonUpdated }: LessonDetailsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const { toast } = useToast()

  const displayTime = lesson.original_time || new Date(lesson.scheduled_at).toTimeString().slice(0, 5)
  const scheduledDate = new Date(lesson.scheduled_at)

  const actualStartTime = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000)

  const [formData, setFormData] = useState({
    title: lesson.title,
    date: scheduledDate.toISOString().split("T")[0],
    time: displayTime,
    duration_minutes: lesson.duration_minutes.toString(),
    status: lesson.status,
    price: lesson.price?.toString() || "",
    notes: lesson.notes || "",
    grade: lesson.grade?.toString() || "",
    homework: lesson.homework || "",
    lesson_link: lesson.lesson_link || "",
  })

  const handleUpdate = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const dateTimeString = `${formData.date}T${formData.time}:00`
      const scheduledAt = new Date(dateTimeString)

      const { error } = await supabase
        .from("lessons")
        .update({
          title: formData.title,
          scheduled_at: scheduledAt.toISOString(),
          original_time: formData.time,
          duration_minutes: Number.parseInt(formData.duration_minutes),
          status: formData.status,
          price: formData.price ? Number.parseFloat(formData.price) : null,
          notes: formData.notes || null,
          grade: formData.grade ? Number.parseInt(formData.grade) : null,
          homework: formData.homework || null,
          lesson_link: formData.lesson_link || null,
        })
        .eq("id", lesson.id)

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Урок обновлен",
      })

      onLessonUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Ошибка обновления урока:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить урок",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickComplete = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("lessons").update({ status: "completed" }).eq("id", lesson.id)

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Урок отмечен как проведенный",
      })

      onLessonUpdated()
    } catch (error) {
      console.error("Ошибка завершения урока:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось завершить урок",
        variant: "destructive",
      })
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

      toast({
        title: "Успешно",
        description: "Урок удален",
      })

      onLessonUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Ошибка удаления урока:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить урок",
        variant: "destructive",
      })
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

  useEffect(() => {
    async function loadUserRole() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        setUserRole(profile?.role || null)
      }
    }
    loadUserRole()
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto animate-slide-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Детали урока
          </DialogTitle>
          <DialogDescription>Просмотр и редактирование урока</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert className="bg-primary/5 border-primary/20">
            <Clock className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                <div>
                  <strong>Введенное время:</strong> {displayTime}
                </div>
                <div>
                  <strong>Фактическое начало:</strong>{" "}
                  {actualStartTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Урок начинается на 2 часа раньше введенного времени
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Информация об ученике */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg card-enhanced">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-lg">{lesson.student_name}</div>
                <div className="text-sm text-muted-foreground">
                  {lesson.lesson_type === "regular" ? "Регулярный урок" : "Разовый урок"}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusColor(lesson.status)} className="text-sm px-3 py-1">
                {getStatusText(lesson.status)}
              </Badge>
              {lesson.status === "scheduled" && (
                <Button size="sm" onClick={handleQuickComplete} disabled={loading} className="ml-2">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Проведено
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Форма редактирования */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Название урока
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Дата
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="transition-all"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Время
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
                  className="transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Статус
                </Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="transition-all">
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
                <Label htmlFor="grade" className="text-sm font-medium flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Оценка
                </Label>
                <Select
                  value={formData.grade || "0"}
                  onValueChange={(value) => setFormData({ ...formData, grade: value })}
                >
                  <SelectTrigger className="transition-all">
                    <SelectValue placeholder="Не выставлена" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Не выставлена</SelectItem>
                    <SelectItem value="5">5 - Отлично</SelectItem>
                    <SelectItem value="4">4 - Хорошо</SelectItem>
                    <SelectItem value="3">3 - Удовлетворительно</SelectItem>
                    <SelectItem value="2">2 - Неудовлетворительно</SelectItem>
                    <SelectItem value="1">1 - Плохо</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="homework" className="text-sm font-medium flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Домашнее задание
              </Label>
              <Textarea
                id="homework"
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                rows={3}
                className="transition-all resize-none"
                placeholder="Опишите домашнее задание для ученика..."
              />
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
                className="transition-all resize-none"
                placeholder="Дополнительная информация..."
              />
            </div>

            {/* Добавлено поле для ссылки на урок */}
            <div className="grid gap-2">
              <Label htmlFor="lesson_link" className="text-sm font-medium flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Ссылка на урок
              </Label>
              <Input
                id="lesson_link"
                type="url"
                value={formData.lesson_link}
                onChange={(e) => setFormData({ ...formData, lesson_link: e.target.value })}
                className="transition-all"
                placeholder="https://zoom.us/j/..."
              />
              <p className="text-xs text-muted-foreground">Эта ссылка будет видна ученику в его личном кабинете</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={loading} className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>

            {userRole === "admin" && lesson.status === "completed" && (
              <CancelLessonEarningDialog lessonId={lesson.id} onSuccess={onLessonUpdated} />
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={handleUpdate} disabled={loading} className="w-full sm:w-auto min-w-[120px]">
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
